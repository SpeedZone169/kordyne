import { handleOnshapeCadExport } from "../export-step/route";

export async function POST(request: Request) {
  return handleOnshapeCadExport(request, "STL");
}
