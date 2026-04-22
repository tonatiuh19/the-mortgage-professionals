/**
 * Uploads a File to the Disrupting Labs CDN and returns the public URL.
 *
 * @param file    The File object to upload (from ImageCropUploader).
 * @param brokerId Broker ID used to namespace the image on the CDN.
 */
export async function uploadAvatarToCDN(
  file: File,
  brokerId: number,
): Promise<string> {
  const formData = new FormData();
  formData.append("main_folder", "themortgageprofessionals-profiles");
  formData.append("id", `profile-${brokerId}`);
  formData.append("main_image", file);

  const secret = import.meta.env.VITE_CDN_UPLOAD_SECRET as string | undefined;

  const res = await fetch(
    "https://disruptinglabs.com/data/api/uploadMortgagexImage.php",
    {
      method: "POST",
      headers: secret ? { "X-Api-Key": secret } : {},
      body: formData,
    },
  );

  if (!res.ok) {
    throw new Error(`CDN request failed: ${res.status}`);
  }

  const data = await res.json();

  if (!data.success || !data.main_image) {
    throw new Error("CDN upload failed: " + (data.error ?? "unknown error"));
  }

  return "https://disruptinglabs.com/data/api" + data.main_image.path;
}

/**
 * Uploads a media file for outbound MMS via our server-side proxy
 * (POST /api/sms/media/upload). The proxy forwards to the PHP endpoint
 * using a server-side secret, so no credentials are exposed to the client.
 *
 * Returns a publicly accessible URL that Twilio can fetch as mediaUrl,
 * plus the detected content_type.
 */
export async function uploadMMSMedia(
  file: File,
  sessionToken: string,
): Promise<{ url: string; content_type: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/sms/media/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${sessionToken}` },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error("MMS upload failed: " + (data.error ?? res.status));
  }

  return { url: data.url as string, content_type: data.content_type as string };
}
