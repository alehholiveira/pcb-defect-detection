import { listInferenceResultKeys, getJsonFromS3, getImageBufferFromS3, uploadPptxToS3 } from "../aws/s3Helper";
import { processImageBuffer } from "../utils/imageUtils";
import { PptxGenerator } from "../utils/pptxGenerator";
import { sendReportEmail } from "../aws/sesHelper";

export async function generateReport(targetDates: string[], reportType: 'daily' | 'weekly'): Promise<string> {
  const allResults = [];
  const defectSummary: Record<string, number> = {};
  let totalInferences = 0;
  let totalImages = 0;
  let totalDefects = 0;

  // Busca inferências para TODAS as datas solicitadas
  for (const date of targetDates) {
    const prefix = `${date}/`;
    const jsonKeys = await listInferenceResultKeys(prefix);

    for (const jsonKey of jsonKeys) {
      const resultData = await getJsonFromS3<any>(jsonKey);
      const inferenceId = jsonKey.split("/")[1];
      
      totalInferences++;
      totalImages += resultData.images.length;
      totalDefects += resultData.total_detections;

      for (const img of resultData.images) {
        for (const det of img.detections) {
          defectSummary[det.class_name] = (defectSummary[det.class_name] || 0) + 1;
        }
      }

      allResults.push({
        inferenceId,
        date: date,
        data: resultData
      });
    }
  }

  if (allResults.length === 0) {
    return "Nenhuma inferência encontrada no período.";
  }

  // Título e formatação da data dependem do tipo de relatório
  const reportTitle = reportType === 'daily' ? 'Relatório Diário' : 'Relatório Semanal';
  const periodLabel = reportType === 'daily' 
    ? targetDates[0] 
    : `${targetDates[targetDates.length - 1]} até ${targetDates[0]}`;

  const pptxGen = new PptxGenerator(`${reportTitle} - ${periodLabel}`);
  pptxGen.addSummarySlide({ totalInferences, totalImages, totalDefects }, defectSummary);

  for (const result of allResults) {
    for (const imgResult of result.data.images) {
      const s3KeyImage = `${result.date}/${result.inferenceId}/${imgResult.image_name}`;
      
      let imgBuffer: Buffer;
      try {
        imgBuffer = await getImageBufferFromS3(s3KeyImage);
      } catch (e) {
        console.error(`Falha ao baixar imagem ${s3KeyImage}. Pulando desenho da imagem.`, e);
        continue;
      }

      const dimensions = processImageBuffer(imgBuffer, imgResult.image_name);
      pptxGen.addImageSlide(result.inferenceId, imgResult.image_name, imgResult.total_detections, dimensions, imgResult.detections);
    }
  }

  const pptxBuffer = await pptxGen.generateBuffer();
  // Cria um nome de arquivo que seja único por período
  const fileSuffix = reportType === 'daily' ? targetDates[0] : `${targetDates[targetDates.length - 1]}_to_${targetDates[0]}`;
  const reportKey = `reports/${reportType}_${fileSuffix}.pptx`;
  
  const reportUrl = await uploadPptxToS3(reportKey, pptxBuffer);
  console.log("Relatório salvo no S3:", reportUrl);

  await sendReportEmail(periodLabel, reportUrl, { totalInferences, totalImages, totalDefects }, reportTitle);

  return "Relatório processado com sucesso";
}
