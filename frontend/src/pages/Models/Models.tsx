import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card/Card';
import { Badge } from '../../components/Badge/Badge';
import { Modal } from '../../components/Modal/Modal';
import { ModelCard } from './ModelCard';
import { Info, ZoomIn, BookOpen } from 'lucide-react';
import {
  classDistributionImg,
  COMPARATIVE_METRICS,
  MODELS_DETAILS,
} from './modelsData';
import './Models.css';

export function Models() {
  const { t } = useTranslation();
  const [activeImage, setActiveImage] = useState<{ src: string; alt: string; title: string } | null>(null);

  const handleImageClick = (src: string, alt: string, title: string) => {
    setActiveImage({ src, alt, title });
  };

  const handleKeyDown = (e: React.KeyboardEvent, src: string, alt: string, label: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleImageClick(src, alt, label);
    }
  };

  const scrollToGlossary = () => {
    const element = document.getElementById('technical-glossary');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const performanceTerms = ['map', 'f1', 'precision', 'recall'];
  const architectureTerms = ['singlestage', 'twostage', 'anchorfree', 'anchorbased', 'transformers', 'focalloss', 'nms'];

  return (
    <div className="models-page">
      {/* Header */}
      <div className="models-page__header">
        <div className="models-page__header-container">
          <div>
            <h1 className="models-page__title">{t('models.page.title')}</h1>
            <p className="models-page__subtitle">{t('models.page.subtitle')}</p>
          </div>
          <button 
            type="button" 
            className="models-page__glossary-shortcut"
            onClick={scrollToGlossary}
          >
            <BookOpen size={16} />
            <span>{t('models.glossary.title')}</span>
          </button>
        </div>
      </div>

      {/* Overview Card */}
      <Card title={t('models.intro.title')}>
        <div className="models-intro">
          <div className="models-intro__text">
            <p>{t('models.intro.description')}</p>
          </div>
          <div className="models-intro__visual">
            <div 
              className="models-intro__img-wrapper model-card__image-wrapper"
              role="button"
              tabIndex={0}
              onClick={() => handleImageClick(classDistributionImg, t('models.intro.title'), t('models.intro.title'))}
              onKeyDown={(e) => handleKeyDown(e, classDistributionImg, t('models.intro.title'), t('models.intro.title'))}
              aria-label={`${t('models.intro.title')} - ${t('models.card.clickToZoom')}`}
            >
              <img
                src={classDistributionImg}
                alt={t('models.intro.chartAlt')}
              />
              <div className="model-card__image-overlay">
                <ZoomIn size={24} />
                <span>{t('models.card.clickToZoom')}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Model Detail Cards */}
      {MODELS_DETAILS.map((model) => (
        <ModelCard
          key={model.id}
          id={model.id}
          badgeVariant={model.badgeVariant}
          trainingImage={model.trainingImage}
          predictionImage={model.predictionImage}
          onImageClick={handleImageClick}
        />
      ))}

      {/* Comparison Table */}
      <Card
        title={t('models.metrics.title')}
        subtitle={t('models.metrics.subtitle')}
        noPadding
      >
        <div className="models-metrics__table-wrapper">
          <table className="models-metrics__table">
            <thead>
              <tr>
                <th>{t('models.metrics.columns.architecture')}</th>
                <th>{t('models.metrics.columns.structure')}</th>
                <th>
                  <div className="models-metrics__header-cell">
                    {t('models.metrics.columns.map')}
                    <button type="button" className="models-metrics__info-btn" onClick={scrollToGlossary} aria-label={t('models.metrics.helpAriaLabel')}>
                      <Info size={14} />
                    </button>
                  </div>
                </th>
                <th>
                  <div className="models-metrics__header-cell">
                    {t('models.metrics.columns.f1')}
                    <button type="button" className="models-metrics__info-btn" onClick={scrollToGlossary} aria-label={t('models.metrics.helpAriaLabel')}>
                      <Info size={14} />
                    </button>
                  </div>
                </th>
                <th>
                  <div className="models-metrics__header-cell">
                    {t('models.metrics.columns.precision')}
                    <button type="button" className="models-metrics__info-btn" onClick={scrollToGlossary} aria-label={t('models.metrics.helpAriaLabel')}>
                      <Info size={14} />
                    </button>
                  </div>
                </th>
                <th>
                  <div className="models-metrics__header-cell">
                    {t('models.metrics.columns.recall')}
                    <button type="button" className="models-metrics__info-btn" onClick={scrollToGlossary} aria-label={t('models.metrics.helpAriaLabel')}>
                      <Info size={14} />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARATIVE_METRICS.map((row, idx) => {
                const badgeText = row.badgeKey
                  ? t(`models.metrics.badges.${row.badgeKey}`)
                  : null;

                return (
                  <tr key={idx}>
                    <td>
                      <div className="models-metrics__cell-arch">
                        <span className="models-metrics__text-arch">
                          {row.architecture}
                        </span>
                        {badgeText && (
                          <Badge variant={row.badgeKey === 'bestPrecisionF1' ? 'success' : row.badgeKey === 'bestMapRecall' ? 'info' : 'neutral'}>
                            {badgeText}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td>{row.structure}</td>
                    <td
                      className={
                        row.isBest?.map50
                          ? 'models-metrics__highlight-cell'
                          : ''
                      }
                    >
                      {row.map50.toFixed(4)}
                    </td>
                    <td
                      className={
                        row.isBest?.f1Macro
                          ? 'models-metrics__highlight-cell'
                          : ''
                      }
                    >
                      {row.f1Macro.toFixed(4)}
                    </td>
                    <td
                      className={
                        row.isBest?.precision
                          ? 'models-metrics__highlight-cell'
                          : ''
                      }
                    >
                      {row.precision.toFixed(4)}
                    </td>
                    <td
                      className={
                        row.isBest?.recall
                          ? 'models-metrics__highlight-cell'
                          : ''
                      }
                    >
                      {row.recall.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Technical Glossary */}
      <div id="technical-glossary">
        <Card 
          title={t('models.glossary.title')}
          subtitle={t('models.glossary.subtitle')}
        >
        <div className="models-glossary__container">
          <div className="models-glossary__group">
            <h3 className="models-glossary__group-title">{t('models.glossary.performanceSection')}</h3>
            <div className="models-glossary__list">
              {performanceTerms.map((term) => (
                <div key={term} className="models-glossary__item">
                  <span className="models-glossary__term-name">{t(`models.glossary.terms.${term}.title`)}</span>
                  <p className="models-glossary__term-desc">{t(`models.glossary.terms.${term}.desc`)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="models-glossary__group">
            <h3 className="models-glossary__group-title">{t('models.glossary.architectureSection')}</h3>
            <div className="models-glossary__list">
              {architectureTerms.map((term) => (
                <div key={term} className="models-glossary__item">
                  <span className="models-glossary__term-name">{t(`models.glossary.terms.${term}.title`)}</span>
                  <p className="models-glossary__term-desc">{t(`models.glossary.terms.${term}.desc`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
      </div>

      {/* Industrial Conclusions */}
      <Card title={t('models.conclusions.title')}>
        <ul className="models-conclusions__list">
          <li className="models-conclusions__item">
            <span className="models-conclusions__marker">1</span>
            <p>
              <strong>YOLOv11:</strong> {t('models.conclusions.yolo')}
            </p>
          </li>
          <li className="models-conclusions__item">
            <span className="models-conclusions__marker">2</span>
            <p>
              <strong>Faster R-CNN:</strong> {t('models.conclusions.fasterrcnn')}
            </p>
          </li>
          <li className="models-conclusions__item">
            <span className="models-conclusions__marker">3</span>
            <p>
              <strong>RetinaNet:</strong> {t('models.conclusions.retinanet')}
            </p>
          </li>
          <li className="models-conclusions__item">
            <span className="models-conclusions__marker">4</span>
            <p>
              <strong>RT-DETR:</strong> {t('models.conclusions.rtdetr')}
            </p>
          </li>
        </ul>
      </Card>

      {/* Image Lightbox Modal */}
      <Modal
        open={!!activeImage}
        onClose={() => setActiveImage(null)}
        title={activeImage?.title}
        size="lg"
      >
        {activeImage && (
          <div className="models-lightbox">
            <div className="models-lightbox__img-container">
              <img
                src={activeImage.src}
                alt={activeImage.alt}
                className="models-lightbox__img"
              />
            </div>
            <p className="models-lightbox__caption">{activeImage.alt}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

