import { NextResponse } from 'next/server';

export async function GET() {
  // Mock data for boards
  const mockBoards = [
    {
      id: 1,
      name: "Sprint Tasks",
      projectName: "Website Redesign",
      taskCount: 12,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 2,
      name: "Backend API",
      projectName: "Mobile App",
      taskCount: 8,
      lastUpdated: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 3,
      name: "Q3 Marketing",
      projectName: "SEO Campaign",
      taskCount: 24,
      lastUpdated: new Date(Date.now() - 172800000).toISOString(),
    }
  ];

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return NextResponse.json(mockBoards);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, projectName } = body;
    
    if (!name || !projectName) {
      return NextResponse.json({ error: 'Name and project name are required' }, { status: 400 });
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Return the mocked new board
    return NextResponse.json({
      id: Math.floor(Math.random() * 1000) + 10,
      name,
      projectName,
      taskCount: 0,
      lastUpdated: new Date().toISOString()
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}
