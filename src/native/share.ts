import { bytesToBase64 } from "./platform";

export async function shareLinkNatively(url: string, title: string): Promise<void> {
  const { Share } = await import("@capacitor/share");
  await Share.share({ title, url, dialogTitle: "Send this deal check" });
}

export async function sharePdfNatively(bytes: Uint8Array, fileName: string, title: string): Promise<void> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  await Filesystem.writeFile({ path: fileName, data: bytesToBase64(bytes), directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
  const { Share } = await import("@capacitor/share");
  await Share.share({ title, files: [uri], dialogTitle: "Send or save the PDF" });
}
