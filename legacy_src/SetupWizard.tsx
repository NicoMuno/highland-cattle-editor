import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

import { GITHUB_CLIENT_ID, DEV_REPO_OWNER, DEV_REPO_NAME, DEV_REPO_BRANCH } from "../../config";

type DeviceStart = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

export function SetupWizard({ onDone }: { onDone: () => void }) {
  const [status, setStatus] = useState<
    "checking" | "needs-setup" | "auth" | "downloading" | "error"
  >("checking");

  const [msg, setMsg] = useState<string>("");
  const [device, setDevice] = useState<DeviceStart | null>(null);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    (async () => {
      await invoke("init_website_storage");
      const hasPkg = await invoke<boolean>("file_exists_in_website", {
        relative_path: "package.json",
      });

      if (hasPkg) {
        onDone();
      } else {
        setStatus("needs-setup");
      }
    })().catch((e) => {
      setMsg(String(e));
      setStatus("error");
    });
  }, [onDone]);

  async function startAuth() {
    setMsg("");
    const d = await invoke<DeviceStart>("github_device_start", {
      clientId: GITHUB_CLIENT_ID,
    });
    setDevice(d);
    setStatus("auth");
    await openUrl(d.verification_uri);
  }

  async function pollForToken() {
    if (!device) return;

    setMsg("Waiting for authorization...");
    while (true) {
      try {
        const t = await invoke<string>("github_device_poll", {
          clientId: GITHUB_CLIENT_ID,
          deviceCode: device.device_code,
        });
        setToken(t);
        setMsg("Authorized ✅");
        return;
      } catch (e) {
        const s = String(e);
        // expected during waiting
        if (s.startsWith("authorization_pending") || s.startsWith("slow_down")) {
          await new Promise((r) => setTimeout(r, device.interval * 1000));
          continue;
        }
        throw e;
      }
    }
  }

  async function downloadRepo() {
    if (!token) return;
    setStatus("downloading");
    setMsg("Downloading website...");

    await invoke("download_and_extract_repo", {
      accessToken: token,
      owner: DEV_REPO_OWNER,
      repo: DEV_REPO_NAME, 
      branch: DEV_REPO_BRANCH,
    });

    setMsg("Download complete ✅");
    onDone();
  }

  if (status === "checking") return <div style={{ padding: 16 }}>Checking setup…</div>;

  if (status === "error")
    return (
      <div style={{ padding: 16 }}>
        <h2>Setup error</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{msg}</pre>
      </div>
    );

  return (
    <div style={{ padding: 16, maxWidth: 600 }}>
      <h1>Setup</h1>

      {status === "needs-setup" && (
        <>
          <p>The website files are not installed yet. Let’s download them from GitHub.</p>
          <button onClick={startAuth}>Connect GitHub</button>
        </>
      )}

      {status === "auth" && device && (
        <>
          <p>
            1) Go to: <b>{device.verification_uri}</b>
            <br />
            2) Enter code: <b>{device.user_code}</b>
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => openUrl(device.verification_uri)}>Open login page</button>
            <button onClick={pollForToken}>I approved — continue</button>
          </div>
          {msg && <p>{msg}</p>}
          {token && (
            <div style={{ marginTop: 12 }}>
              <button onClick={downloadRepo}>Download website</button>
            </div>
          )}
        </>
      )}

      {status === "downloading" && <p>{msg}</p>}
    </div>
  );
}
