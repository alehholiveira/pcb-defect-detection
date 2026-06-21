import sizeOf from "image-size";

export interface ImageDimensions {
  width: number;
  height: number;
  base64Data: string;
}

export function processImageBuffer(imgBuffer: Buffer, filename: string): ImageDimensions {
  const dimensions = sizeOf(imgBuffer);
  const width = dimensions.width || 800;
  const height = dimensions.height || 800;

  const extMatch = filename.match(/\.(png|jpe?g)$/i);
  const ext = extMatch ? extMatch[1].replace("jpg", "jpeg").toLowerCase() : "jpeg";
  const base64Data = `image/${ext};base64,${imgBuffer.toString("base64")}`;

  return { width, height, base64Data };
}
