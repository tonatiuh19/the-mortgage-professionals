/**
 * Uploads a File to the Disrupting Labs CDN and returns the public URL.
 *
 * @param file     The File object to upload (from ImageCropUploader).
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

  const res = await fetch(
    "https://disruptinglabs.com/data/api/uploadImages.php",
    { method: "POST", body: formData },
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
