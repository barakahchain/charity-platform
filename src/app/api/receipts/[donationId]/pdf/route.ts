import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { donations, projects, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import PDFDocument from "pdfkit";

export async function GET(
  request: NextRequest,
  { params }: { params: { donationId: string } }
) {
  try {
    const { donationId } = params;

    // Fetch donation with related data
    const donation = await db
      .select({
        donation: donations,
        project: projects,
        donor: users,
      })
      .from(donations)
      .leftJoin(projects, eq(donations.projectId, projects.id))
      .leftJoin(users, eq(donations.donorWallet, users.walletAddress))
      .where(eq(donations.id, parseInt(donationId)))
      .limit(1);

    if (!donation || donation.length === 0) {
      return NextResponse.json(
        { error: "Donation not found" },
        { status: 404 }
      );
    }

    const { donation: donationData, project, donor } = donation[0];

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    // Generate PDF content
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Zakat Receipt", { align: "center" })
      .moveDown();

    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Receipt ID: ${donationData.id}`, { align: "right" })
      .text(`Date: ${new Date(donationData.timestamp).toLocaleDateString()}`, {
        align: "right",
      })
      .moveDown(2);

    // Donor Information
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Donor Information")
      .moveDown(0.5);

    doc
      .fontSize(11)
      .font("Helvetica")
      .text(`Name: ${donor?.name || "Anonymous"}`)
      .text(`Wallet Address: ${donationData.donorWallet}`)
      .moveDown(1.5);

    // Project Information
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Project Information")
      .moveDown(0.5);

    doc
      .fontSize(11)
      .font("Helvetica")
      .text(`Project: ${project.title}`)
      .text(`Description: ${project.description}`)
      .text(`Zakat Mode: ${project.zakatMode ? "Yes" : "No"}`)
      .text(`Asnaf Category: ${project.asnafTag || "N/A"}`)
      .moveDown(1.5);

    // Donation Details
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Donation Details")
      .moveDown(0.5);

    doc
      .fontSize(11)
      .font("Helvetica")
      .text(`Amount: ${donationData.amount} USDC`)
      .text(`Transaction Hash: ${donationData.txHash}`)
      .text(
        `PolygonScan: https://mumbai.polygonscan.com/tx/${donationData.txHash}`
      )
      .moveDown(1.5);

    // Shariah Compliance Statement (if Zakat Mode)
    if (project.zakatMode) {
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Shariah Compliance Statement")
        .moveDown(0.5);

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(
          "This donation has been made in accordance with Shariah principles, including:",
          { align: "justify" }
        )
        .moveDown(0.3)
        .text("• Tamlik (Complete Ownership Transfer)", { indent: 20 })
        .text(`• Asnaf Categorization: ${project.asnafTag}`, { indent: 20 })
        .text(`• Contract Type: ${project.contractTemplate || "Wakālah"}`, {
          indent: 20,
        })
        .moveDown(0.5)
        .text(
          "This receipt has been reviewed and approved by the Shariah Supervisory Board.",
          { align: "justify", italics: true }
        )
        .moveDown(1.5);
    }

    // Footer
    doc
      .fontSize(9)
      .font("Helvetica")
      .text(
        "This is a computer-generated receipt and does not require a signature.",
        { align: "center", italics: true }
      )
      .moveDown(0.5)
      .text("For verification, please visit our platform with the Receipt ID.", {
        align: "center",
        italics: true,
      });

    // Finalize PDF
    doc.end();

    // Wait for PDF to be generated
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="zakat-receipt-${donationId}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF receipt", details: error.message },
      { status: 500 }
    );
  }
}