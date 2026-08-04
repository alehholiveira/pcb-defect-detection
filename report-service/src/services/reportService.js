import { listInferenceResultKeys, getJsonFromS3, getImageBufferFromS3, uploadPptxToS3, uploadJsonToS3 } from "../aws/s3Helper.js";
import { processImageBuffer } from "../utils/imageUtils.js";
import { PptxGenerator } from "../utils/pptxGenerator.js";
import { sendReportEmail } from "../aws/sesHelper.js";
import { LAMBDA_ERRORS } from "../utils/errors.js";
import { formatDateRange, emailTranslations } from "../utils/i18n.js";
import { env } from "../config/env.js";

/** Helper to get timestamp formatted for filenames in local timezone */
function getLocalTimestampStr(dateObj = new Date()) {
  const tz = env.APP_TIMEZONE;
  try {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    // sv-SE locale outputs "YYYY-MM-DD HH:mm:ss", replace spaces and colons with underscores
    return formatter.format(dateObj).replace(/[: ]/g, '_');
  } catch (e) {
    return dateObj.toISOString().replace(/[:.]/g, '-');
  }
}

/**
 * Generates an automated report (daily/weekly/monthly).
 * 
 * Pipeline:
 * 1. Fetch JSON metadata from S3 for target dates
 * 2. Download original detection images from S3
 * 3. Generate PPTX slides with bounding boxes
 * 4. Upload PPTX and JSON metadata to S3
 * 5. Send SES email notification
 * 
 * Expected JSON structure:
 * { inferences: [ { images: [ { detections: [ { class_name, x1, y1, x2, y2, confidence } ] } ] } ] }
 * 
 * @param {string[]} targetDates - Array of dates in YYYY-MM-DD format
 * @param {string} reportType - Type of report ('daily', 'weekly', 'monthly')
 * @returns {Promise<string>} Success message
 */
export async function generateReport(targetDates, reportType) {
  console.log(`[reportService.js] generateReport - Init`, { targetDates, reportType });
  const allResults = [];
  const defectSummary = {};
  let totalInferences = 0;
  let totalImages = 0;
  let totalDefects = 0;

  try {
    // Fetch inferences for ALL requested dates
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
      console.log(`[reportService.js] generateReport - Info (No inferences found. Generating empty report.)`);
    }

    const lang = env.DEFAULT_LANGUAGE;
    const t = emailTranslations[lang];

    const oldest = targetDates[0];
    const newest = targetDates[targetDates.length - 1];

    let reportTitle = t.weeklyReport;
    if (reportType === 'daily') reportTitle = t.dailyReport;
    else if (reportType === 'monthly') reportTitle = t.monthlyReport;

    const periodLabel = formatDateRange(oldest, newest, lang);

    const pptxGen = new PptxGenerator(`${reportTitle} - ${periodLabel}`);
    
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
    // Create a filename unique per period. Multi-day reports use newest_to_oldest format to easily identify the range in alphabetical sorting.
    const fileSuffix = reportType === 'daily' ? targetDates[0] : `${targetDates[targetDates.length - 1]}_to_${targetDates[0]}`;
    const filenameBase = `${reportType}_${fileSuffix}`;
    const reportKey = `reports/${filenameBase}.pptx`;
    const jsonKey = `reports/${filenameBase}.json`;
    
    const reportUrl = await uploadPptxToS3(reportKey, pptxBuffer);
    console.log(`[reportService.js] generateReport - Relatório salvo no S3: ${reportUrl}`);

    // Create and save JSON metadata
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

    await sendReportEmail(periodLabel, reportUrl, { totalInferences, totalImages, totalDefects }, reportTitle, defectSummary, lang);

    console.log(`[reportService.js] generateReport - Success`);
    return "Relatório processado com sucesso";
  } catch (error) {
    console.error(`[reportService.js] generateReport - Error`, error);
    throw LAMBDA_ERRORS.INTERNAL_ERROR;
  }
}

/**
 * Generates a manual report from a list of {id, date}.
 * @param {Array<{id: number, date: string}>} inferences - ID and date pairs
 * @param {string} reportName - User-defined report title
 * @param {string} requestedBy - Who requested the report (e.g. "manual")
 * @returns {Promise<string>} Success message
 */
export async function generateManualReport(inferences, reportName, requestedBy) {
  console.log(`[reportService.js] generateManualReport - Init`, { count: inferences.length, reportName, requestedBy });
  const allResults = [];
  const defectSummary = {};
  let totalInferences = 0;
  let totalImages = 0;
  let totalDefects = 0;

  try {
    let oldestDate = null;
    let newestDate = null;

    for (const inf of inferences) {
      const jsonKey = `${inf.date}/${inf.id}/result.json`;
      let resultData;
      
      try {
        resultData = await getJsonFromS3(jsonKey);
      } catch (e) {
        console.error(`[reportService.js] generateManualReport - Error ao baixar JSON ${jsonKey}. Pulando inferência.`, e);
        continue;
      }

      totalInferences++;
      totalImages += resultData.images.length;
      totalDefects += resultData.total_detections;

      for (const img of resultData.images) {
        for (const det of img.detections) {
          defectSummary[det.class_name] = (defectSummary[det.class_name] || 0) + 1;
        }
      }

      allResults.push({
        inferenceId: inf.id,
        date: inf.date,
        data: resultData
      });

      // Track min/max dates
      if (!oldestDate || inf.date < oldestDate) oldestDate = inf.date;
      if (!newestDate || inf.date > newestDate) newestDate = inf.date;
    }

    if (allResults.length === 0) {
      console.log(`[reportService.js] generateManualReport - Info (No valid inferences found.)`);
      return "Nenhuma inferência processada";
    }

    const pptxGen = new PptxGenerator(reportName);
    
    const logoPath = "./src/assets/logo.png";
    pptxGen.addSummarySlide({ totalInferences, totalImages, totalDefects }, defectSummary, logoPath);

    for (const result of allResults) {
      for (const imgResult of result.data.images) {
        const s3KeyImage = `${result.date}/${result.inferenceId}/${imgResult.image_name}`;
        
        let imgBuffer;
        try {
          imgBuffer = await getImageBufferFromS3(s3KeyImage);
        } catch (e) {
          console.error(`[reportService.js] generateManualReport - Error ao baixar imagem ${s3KeyImage}. Pulando desenho.`, e);
          continue;
        }

        const dimensions = processImageBuffer(imgBuffer, imgResult.image_name);
        pptxGen.addImageSlide(result.inferenceId, imgResult.image_name, imgResult.total_detections, dimensions, imgResult.detections);
      }
    }

    const pptxBuffer = await pptxGen.generateBuffer();
    
    const timestampStr = getLocalTimestampStr();
    const filenameBase = `manual_${timestampStr}`;
    const reportKey = `reports/${filenameBase}.pptx`;
    const jsonKey = `reports/${filenameBase}.json`;
    
    const reportUrl = await uploadPptxToS3(reportKey, pptxBuffer);
    console.log(`[reportService.js] generateManualReport - Relatório salvo no S3: ${reportUrl}`);

    const metadata = {
      reportName: reportName,
      filename: `${filenameBase}.pptx`,
      downloadUrl: reportUrl,
      generatedAt: new Date().toISOString(),
      reportType: "manual",
      periodStart: oldestDate,
      periodEnd: newestDate,
      totalInferences: totalInferences,
      totalImages: totalImages,
      totalDefects: totalDefects,
      defectsByType: defectSummary,
      generatedBy: requestedBy
    };

    await uploadJsonToS3(jsonKey, metadata);
    console.log(`[reportService.js] generateManualReport - Metadados JSON salvos no S3: ${jsonKey}`);

    const lang = env.DEFAULT_LANGUAGE;
    const periodLabel = formatDateRange(oldestDate, newestDate, lang);
    await sendReportEmail(periodLabel, reportUrl, { totalInferences, totalImages, totalDefects }, reportName, defectSummary, lang);

    console.log(`[reportService.js] generateManualReport - Success`);
    return "Relatório manual processado com sucesso";
  } catch (error) {
    console.error(`[reportService.js] generateManualReport - Error`, error);
    throw LAMBDA_ERRORS.INTERNAL_ERROR;
  }
}
