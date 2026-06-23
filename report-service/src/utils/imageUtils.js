import sizeOf from "image-size";

export function processImageBuffer(imgBuffer, filename) {
  console.log(`[imageUtils.js] processImageBuffer - Init`, { filename, bufferSize: imgBuffer?.length });
  
  const dimensions = sizeOf(imgBuffer);
  const width = dimensions.width || 800;
  const height = dimensions.height || 800;

  const extMatch = filename.match(/\.(png|jpe?g)$/i);
  const ext = extMatch ? extMatch[1].replace("jpg", "jpeg").toLowerCase() : "jpeg";
  const base64Data = `image/${ext};base64,${imgBuffer.toString("base64")}`;

  console.log(`[imageUtils.js] processImageBuffer - Success`, { width, height });
  return { width, height, base64Data };
}
