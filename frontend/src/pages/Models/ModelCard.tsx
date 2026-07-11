import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card/Card';
import { Badge } from '../../components/Badge/Badge';
import { ZoomIn } from 'lucide-react';

interface ModelCardProps {
  id: string; // 'yolo' | 'fasterrcnn' | 'retinanet' | 'rtdetr'
  badgeVariant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  trainingImage: string;
  predictionImage: string;
  onImageClick: (src: string, alt: string, title: string) => void;
}

export function ModelCard({
  id,
  badgeVariant,
  trainingImage,
  predictionImage,
  onImageClick,
}: ModelCardProps) {
  const { t } = useTranslation();

  const title = t(`models.architectures.${id}.name`, id.toUpperCase());
  const category = t(`models.architectures.${id}.category`);
  const highlight = t(`models.architectures.${id}.highlight`);

  const handleKeyDown = (e: React.KeyboardEvent, src: string, alt: string, label: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onImageClick(src, alt, label);
    }
  };

  return (
    <Card
      title={title}
      subtitle={category}
      headerAction={
        <Badge variant={badgeVariant} dot>
          {highlight}
        </Badge>
      }
      className="model-card"
    >
      <div className="model-card__content">
        <div className="model-card__text">
          <div className="model-card__section">
            <h4>{t('models.card.howItWorks')}</h4>
            <p>{t(`models.architectures.${id}.howItWorks`)}</p>
          </div>

          <div className="model-card__section">
            <h4>{t('models.card.pcbContext')}</h4>
            <p>{t(`models.architectures.${id}.pcbContext`)}</p>
          </div>

          <div className="model-card__section">
            <h4>{t('models.card.expectative')}</h4>
            <p>{t(`models.architectures.${id}.expectative`)}</p>
          </div>
        </div>

        <div className="model-card__visuals">
          <div className="model-card__image-container">
            <h5>{t('models.card.trainingCurves')}</h5>
            <div 
              className="model-card__image-wrapper"
              role="button"
              tabIndex={0}
              onClick={() => onImageClick(trainingImage, `${title} - ${t('models.card.trainingCurves')}`, t('models.card.trainingCurves'))}
              onKeyDown={(e) => handleKeyDown(e, trainingImage, `${title} - ${t('models.card.trainingCurves')}`, t('models.card.trainingCurves'))}
              aria-label={`${t('models.card.trainingCurves')} - ${t('models.card.clickToZoom')}`}
            >
              <img src={trainingImage} alt={t('models.card.trainingCurvesAlt', { model: title })} />
              <div className="model-card__image-overlay">
                <ZoomIn size={20} />
                <span>{t('models.card.clickToZoom')}</span>
              </div>
            </div>
          </div>

          <div className="model-card__image-container">
            <h5>{t('models.card.predictions')}</h5>
            <div 
              className="model-card__image-wrapper"
              role="button"
              tabIndex={0}
              onClick={() => onImageClick(predictionImage, `${title} - ${t('models.card.predictions')}`, t('models.card.predictions'))}
              onKeyDown={(e) => handleKeyDown(e, predictionImage, `${title} - ${t('models.card.predictions')}`, t('models.card.predictions'))}
              aria-label={`${t('models.card.predictions')} - ${t('models.card.clickToZoom')}`}
            >
              <img src={predictionImage} alt={t('models.card.predictionsAlt', { model: title })} />
              <div className="model-card__image-overlay">
                <ZoomIn size={20} />
                <span>{t('models.card.clickToZoom')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

