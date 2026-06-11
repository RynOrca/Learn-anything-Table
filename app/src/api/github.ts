// ---------------------------------------------------------------------------
// GitHub API client
// ---------------------------------------------------------------------------

export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  body: string;
}

export async function checkLatestVersion(): Promise<GitHubRelease | null> {
  try {
    const res = await fetch(
      'https://api.github.com/repos/ChenChenyaqi/learn-anything/releases/latest',
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return null;
    return (await res.json()) as GitHubRelease;
  } catch {
    return null;
  }
}
