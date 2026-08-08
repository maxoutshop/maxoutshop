import { IS_NATIVE_BUILD } from "./api-base";

/**
 * Picks a food photo. Native (Capacitor iOS) uses the Capacitor Camera plugin,
 * which is far more reliable than `<input capture>` inside WKWebView. The web
 * build keeps the existing hidden file input behaviour.
 */
export async function captureFoodPhoto(): Promise<string | null> {
  if (!IS_NATIVE_BUILD) return null;
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");

  const photo = await Camera.getPhoto({
    quality: 70,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Prompt,
    promptLabelHeader: "Log food",
    promptLabelPhoto: "Choose from library",
    promptLabelPicture: "Take a photo",
    correctOrientation: true,
    width: 1280,
  });

  return photo.dataUrl ?? null;
}
