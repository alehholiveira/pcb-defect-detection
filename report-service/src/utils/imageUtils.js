import sizeOf from "image-size";

/**
 * Processes an image buffer to extract its dimensions and convert it to a Data URI.
 * The returned dimensions are used later by the PPTX generator for aspect-ratio-preserving scaling.
 * 
 * @param {Buffer} imgBuffer - The raw image buffer from S3
 * @param {string} filename - The original filename of the image
 * @returns {{width: number, height: number, base64Data: string}} Extracted dimensions and Base64 Data URI
 */
export function processImageBuffer(imgBuffer, filename) {
  console.log(`[imageUtils.js] processImageBuffer - Init`, { filename, bufferSize: imgBuffer?.length });

  let width = 800;
  let height = 800;
  try {
    const dimensions = sizeOf(imgBuffer);
    width = dimensions.width || 800;
    height = dimensions.height || 800;
  } catch (err) {
    console.warn(`[imageUtils.js] processImageBuffer - Warning: Could not parse image dimensions for ${filename}. Using 800x800 fallback.`);
  }

  const extMatch = filename.match(/\.(png|jpe?g)$/i);
  // MIME type standard requires 'image/jpeg', not 'image/jpg', so we normalize it here
  const ext = extMatch ? extMatch[1].replace("jpg", "jpeg").toLowerCase() : "jpeg";
  const base64Data = `image/${ext};base64,${imgBuffer.toString("base64")}`;

  console.log(`[imageUtils.js] processImageBuffer - Success`, { width, height });
  return { width, height, base64Data };
}
