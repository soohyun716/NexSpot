export interface RequestGuideParams {
  userRequest: string;
  url?: string;
  title?: string;
}

export interface GuideResponse {
  blocked: boolean;
  reason: string | null;
  guideTitle: string;
  meta: {
    source: string;
    requestedTask: string;
    currentUrl: string;
    currentTitle: string;
  };
  steps: any[]; // 나중에 Step 타입 정의해도 됨
  error?: string;
}

export async function requestGuide({
  userRequest,
  url,
  title
}: RequestGuideParams): Promise<GuideResponse> {
  const response = await fetch("http://localhost:4000", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      userRequest,
      url,
      title
    })
  });

  const data = (await response.json().catch(() => null)) as GuideResponse | null;

  if (!response.ok) {
    throw new Error(data?.reason || data?.error || `HTTP ${response.status}`);
  }

  return data!;
}