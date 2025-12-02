// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, milestones, users, userWallets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser, requireRole } from "@/app/api/lib/auth";

const VALID_CONTRACT_TEMPLATES = ["Wakālah", "Juʿālah", "Istisnāʿ"];

interface MilestoneInput {
  description: string;
  amount: number;
  beneficiary: string;
}

interface ProjectInput {
  title: string;
  description: string;
  zakatMode?: boolean;
  asnafTag?: string;
  contractTemplate: string;
  totalAmount: number;
  metaCid?: string;
  milestones: MilestoneInput[];
}

// POST /api/projects
// export async function POST(request: NextRequest) {
//   try {
//     // 1. Get authenticated user
//     const user = await requireRole(request, "charity");
    
//     // 2. Parse request body
//     const body: ProjectInput = await request.json();
//     const {
//       title,
//       description,
//       metaCid,
//       zakatMode,
//       asnafTag,
//       contractTemplate,
//       totalAmount,
//       milestones: milestonesData,
//     } = body;

//     // 3. Validate required fields
//     if (!title?.trim())
//       return NextResponse.json(
//         { error: "title is required", code: "INVALID_TITLE" },
//         { status: 400 }
//       );
    
//     if (!description?.trim())
//       return NextResponse.json(
//         { error: "description is required", code: "INVALID_DESCRIPTION" },
//         { status: 400 }
//       );

//     if (!metaCid?.trim()) {
//       return NextResponse.json(
//         { error: "metaCid (IPFS hash) is required", code: "MISSING_META_CID" },
//         { status: 400 }
//       );
//     }

//     if (!VALID_CONTRACT_TEMPLATES.includes(contractTemplate)) {
//       return NextResponse.json(
//         {
//           error: `contractTemplate must be one of: ${VALID_CONTRACT_TEMPLATES.join(", ")}`,
//           code: "INVALID_CONTRACT_TEMPLATE",
//         },
//         { status: 400 }
//       );
//     }
    
//     if (!totalAmount || totalAmount <= 0)
//       return NextResponse.json(
//         { error: "totalAmount must be positive", code: "INVALID_TOTAL_AMOUNT" },
//         { status: 400 }
//       );
    
//     if (!milestonesData?.length)
//       return NextResponse.json(
//         { error: "milestones array is required", code: "INVALID_MILESTONES" },
//         { status: 400 }
//       );

//     // 4. Validate milestone sum equals total amount
//     const milestonesSum = milestonesData.reduce((sum, m) => sum + m.amount, 0);
//     if (Math.abs(milestonesSum - totalAmount) > 0.01) {
//       return NextResponse.json(
//         {
//           error: `Sum of milestone amounts (${milestonesSum}) must equal totalAmount (${totalAmount})`,
//           code: "MILESTONES_SUM_MISMATCH",
//         },
//         { status: 400 }
//       );
//     }

//     // 5. Get charity's primary wallet address
//     const charityWallets = await db
//       .select()
//       .from(userWallets)
//       .where(
//         and(
//           eq(userWallets.userId, user.id),
//           eq(userWallets.isPrimary, true),
//           eq(userWallets.status, "active")
//         )
//       )
//       .limit(1);

//     if (charityWallets.length === 0) {
//       return NextResponse.json(
//         {
//           error: "Charity must have an active primary wallet to create projects",
//           code: "NO_PRIMARY_WALLET",
//         },
//         { status: 400 }
//       );
//     }

//     const charityWalletAddress = charityWallets[0].walletAddress;

//     // 6. Insert project
//     const createdAt = new Date().toISOString();
//     const [newProject] = await db
//       .insert(projects)
//       .values({
//         charityId: user.id, // Use authenticated user's ID
//         walletAddress: charityWalletAddress,
//         title: title.trim(),
//         description: description.trim(),
//         metaCid: metaCid.trim(),
//         zakatMode: !!zakatMode,
//         asnafTag: asnafTag?.trim() || null,
//         contractTemplate,
//         totalAmount,
//         fundedBalance: 0,
//         status: "active",
//         createdAt,
//       })
//       .returning();

//     const projectId = newProject.id;

//     // 7. Insert milestones
//     const createdMilestones = [];
//     for (const m of milestonesData) {
//       const [milestone] = await db
//         .insert(milestones)
//         .values({
//           projectId,
//           description: m.description.trim(),
//           amount: m.amount,
//           beneficiaryAddress: m.beneficiary.trim(),
//           status: "pending",
//           createdAt,
//         })
//         .returning();
//       createdMilestones.push(milestone);
//     }

//     return NextResponse.json(
//       { ...newProject, milestones: createdMilestones },
//       { status: 201 }
//     );
//   } catch (error: any) {
//     console.error("POST error:", error);
    
//     // Handle auth errors
//     if (error.message.includes("Unauthorized") || error.message.includes("Forbidden")) {
//       return NextResponse.json(
//         { error: error.message },
//         { status: error.message.includes("Forbidden") ? 403 : 401 }
//       );
//     }
    
//     return NextResponse.json(
//       { error: "Internal server error: " + error.message },
//       { status: 500 }
//     );
//   }
// }

// GET /api/projects
export async function GET(req: NextRequest) {
  try {
    // Get user from session
    const user = await getAuthenticatedUser(req);
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in" },
        { status: 401 }
      );
    }

     console.log("🔍 Authenticated user from JWT:", user);
    console.log("🔍 User ID type:", typeof user.id, "Value:", user.id);

    const { searchParams } = new URL(req.url);
    
    // Admin can view all or filter by charityId (for admin dashboard)
    if (user.role === "admin") {
      const charityId = searchParams.get("charityId");
      if (charityId) {
        const charityProjects = await db
          .select()
          .from(projects)
          .where(eq(projects.charityId, parseInt(charityId)))
          .orderBy(projects.createdAt);
        return NextResponse.json(charityProjects);
      }
      // Admin can see all projects if no charityId specified
      const allProjects = await db.select().from(projects).orderBy(projects.createdAt);
      return NextResponse.json(allProjects);
    }
    
    // Regular users (charity/donor) can only see their own projects
    // For charities: their created projects
    // For donors: projects they've donated to (you might want to add this)
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.charityId, user.id))
      .orderBy(projects.createdAt);

    console.log("Fetched projects for user:", user.id, userProjects.length);
    return NextResponse.json(userProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}