import { listInferenceResultKeys, getJsonFromS3, getImageBufferFromS3, uploadPptxToS3, uploadJsonToS3 } from "../aws/s3Helper.js";
import { processImageBuffer } from "../utils/imageUtils.js";
import { PptxGenerator } from "../utils/pptxGenerator.js";
import { sendReportEmail } from "../aws/sesHelper.js";
import { LAMBDA_ERRORS } from "../utils/errors.js";

export async function generateReport(targetDates, reportType) {
  console.log(`[reportService.js] generateReport - Init`, { targetDates, reportType });
  const allResults = [];
  const defectSummary = {};
  let totalInferences = 0;
  let totalImages = 0;
  let totalDefects = 0;

  try {
    // Busca inferências para TODAS as datas solicitadas
    for (const date of targetDates) {
      const prefix = `${date}/`;
      const jsonKeys = await listInferenceResultKeys(prefix);

      for (const jsonKey of jsonKeys) {
        const resultData = await getJsonFromS3(jsonKey);
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
      console.log(`[reportService.js] generateReport - Info (Nenhuma inferencia encontrada. Gerando relatorio zerado.)`);
    }

    // Formatar data de YYYY-MM-DD para DD/MM/YYYY
    const formatPtBr = (dateStr) => {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    };

    const oldest = targetDates[0];
    const newest = targetDates[targetDates.length - 1];

    // Título e formatação da data dependem do tipo de relatório
    const reportTitle = reportType === 'daily' ? 'Relatório Diário' : 'Relatório Semanal';
    const periodLabel = reportType === 'daily' 
      ? formatPtBr(oldest) 
      : `${formatPtBr(oldest)} até ${formatPtBr(newest)}`;

    const pptxGen = new PptxGenerator(`${reportTitle} - ${periodLabel}`);
    
    // Inserir logo da pasta assets
    const logoPath = "./src/assets/logo.png";
    pptxGen.addSummarySlide({ totalInferences, totalImages, totalDefects }, defectSummary, logoPath);

    for (const result of allResults) {
      for (const imgResult of result.data.images) {
        const s3KeyImage = `${result.date}/${result.inferenceId}/${imgResult.image_name}`;
        
        let imgBuffer;
        try {
          imgBuffer = await getImageBufferFromS3(s3KeyImage);
        } catch (e) {
          console.error(`[reportService.js] generateReport - Error ao baixar imagem ${s3KeyImage}. Pulando desenho.`, e);
          continue;
        }

        const dimensions = processImageBuffer(imgBuffer, imgResult.image_name);
        pptxGen.addImageSlide(result.inferenceId, imgResult.image_name, imgResult.total_detections, dimensions, imgResult.detections);
      }
    }

    const pptxBuffer = await pptxGen.generateBuffer();
    // Cria um nome de arquivo que seja único por período
    const fileSuffix = reportType === 'daily' ? targetDates[0] : `${targetDates[targetDates.length - 1]}_to_${targetDates[0]}`;
    const filenameBase = `${reportType}_${fileSuffix}`;
    const reportKey = `reports/${filenameBase}.pptx`;
    const jsonKey = `reports/${filenameBase}.json`;
    
    const reportUrl = await uploadPptxToS3(reportKey, pptxBuffer);
    console.log(`[reportService.js] generateReport - Relatório salvo no S3: ${reportUrl}`);

    // Cria e salva o JSON de metadados
    const metadata = {
      reportName: `${reportTitle} - ${periodLabel}`,
      filename: `${filenameBase}.pptx`,
      downloadUrl: reportUrl,
      generatedAt: new Date().toISOString(),
      reportType: reportType,
      periodStart: oldest,
      periodEnd: newest,
      totalInferences: totalInferences,
      totalImages: totalImages,
      totalDefects: totalDefects,
      defectsByType: defectSummary,
      generatedBy: "system"
    };

    await uploadJsonToS3(jsonKey, metadata);
    console.log(`[reportService.js] generateReport - Metadados JSON salvos no S3: ${jsonKey}`);

    await sendReportEmail(periodLabel, reportUrl, { totalInferences, totalImages, totalDefects }, reportTitle);

    console.log(`[reportService.js] generateReport - Success`);
    return "Relatório processado com sucesso";
  } catch (error) {
    console.error(`[reportService.js] generateReport - Error`, error);
    throw LAMBDA_ERRORS.INTERNAL_ERROR;
  }
}
