import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { detectFileType } from "../services/documentParser.service";
import { indexDocument, reindexDocument } from "../services/kbIndexer.service";
import { saveFile, readFile, deleteFile } from "../lib/storage";
import { env } from "../config/env";

export const kbRouter = Router();
kbRouter.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.maxUploadMb * 1024 * 1024 } });

kbRouter.get("/", async (req, res) => {
  const docs = await prisma.knowledgeDocument.findMany({
    where: { businessId: req.auth!.businessId },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      filename: true,
      fileType: true,
      sizeBytes: true,
      status: true,
      errorMessage: true,
      uploadedAt: true,
      indexedAt: true,
      _count: { select: { chunks: true } },
    },
  });
  res.json({ documents: docs });
});

kbRouter.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) throw new ApiError(400, "No file uploaded");
  const fileType = detectFileType(req.file.originalname, req.file.mimetype);
  if (!fileType) throw new ApiError(400, "Unsupported file type. Use PDF, DOCX, TXT, or Markdown.");

  const doc = await prisma.knowledgeDocument.create({
    data: {
      businessId: req.auth!.businessId,
      filename: req.file.originalname,
      fileType,
      sizeBytes: req.file.size,
      storagePath: "", // set right after
      status: "PENDING",
    },
  });

  const storagePath = await saveFile(req.auth!.businessId, doc.id, req.file.originalname, req.file.buffer);
  await prisma.knowledgeDocument.update({ where: { id: doc.id }, data: { storagePath } });

  // Index inline for the take-home (small files). In production this would be
  // handed off to a queue (BullMQ/SQS) so upload requests return instantly.
  indexDocument(doc.id, req.file.buffer, req.file.originalname, req.file.mimetype).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(`Indexing failed for document ${doc.id}:`, err);
  });

  res.status(202).json({ document: doc, message: "Upload received, indexing started." });
});

kbRouter.post("/:id/reindex", async (req, res) => {
  const doc = await prisma.knowledgeDocument.findFirst({
    where: { id: req.params.id, businessId: req.auth!.businessId },
  });
  if (!doc) throw new ApiError(404, "Document not found");

  const buffer = await readFile(doc.storagePath);
  reindexDocument(doc.id, buffer, doc.filename, "").catch((err) => {
    // eslint-disable-next-line no-console
    console.error(`Reindex failed for document ${doc.id}:`, err);
  });

  res.status(202).json({ message: "Re-indexing started." });
});

kbRouter.delete("/:id", async (req, res) => {
  const doc = await prisma.knowledgeDocument.findFirst({
    where: { id: req.params.id, businessId: req.auth!.businessId },
  });
  if (!doc) throw new ApiError(404, "Document not found");

  await prisma.knowledgeDocument.delete({ where: { id: doc.id } }); // cascades to chunks
  await deleteFile(doc.storagePath);

  res.json({ message: "Document deleted" });
});
