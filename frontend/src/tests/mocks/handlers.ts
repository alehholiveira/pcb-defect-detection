import { http, HttpResponse } from 'msw';

export const mockInferences = [
  {
    id: 1,
    date: '2026-07-31T12:00:00.000Z',
    model_name: 'yolov8',
    total_images: 2,
    total_detections: 3,
    status: 'completed',
    images: [
      {
        id: 10,
        image_name: 'board_01.png',
        image_url: 'http://localhost:3000/images/board_01.png',
        total_detections: 2,
        detections: [
          { class_name: 'missing_hole', confidence: 0.98, bbox: [10, 10, 50, 50] },
          { class_name: 'short', confidence: 0.95, bbox: [60, 60, 100, 100] }
        ]
      },
      {
        id: 11,
        image_name: 'board_02.png',
        image_url: 'http://localhost:3000/images/board_02.png',
        total_detections: 1,
        detections: [
          { class_name: 'mouse_bite', confidence: 0.91, bbox: [20, 20, 40, 40] }
        ]
      }
    ]
  },
  {
    id: 2,
    date: '2026-07-30T10:00:00.000Z',
    model_name: 'resnet50',
    total_images: 1,
    total_detections: 0,
    status: 'completed',
    images: [
      {
        id: 12,
        image_name: 'board_clean.png',
        image_url: 'http://localhost:3000/images/board_clean.png',
        total_detections: 0,
        detections: []
      }
    ]
  }
];

export const handlers = [
  // List Inferences
  http.get('*/api/v1/inferences', () => {
    return HttpResponse.json({
      data: mockInferences,
      total: mockInferences.length,
      page: 1,
      limit: 10,
      totalPages: 1
    });
  }),

  // Get Inference By ID
  http.get('*/api/v1/inferences/:id', ({ params }) => {
    const id = Number(params.id);
    const item = mockInferences.find(i => i.id === id);
    if (!item) {
      return new HttpResponse(JSON.stringify({ error: 'Inference not found' }), { status: 404 });
    }
    return HttpResponse.json(item);
  }),

  // Delete Inference
  http.delete('*/api/v1/inferences/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Predict Endpoint
  http.post('*/ml-service/predict', () => {
    return HttpResponse.json({
      inference_id: 99,
      model_name: 'yolov8',
      total_images: 1,
      total_detections: 1,
      images: [
        {
          image_name: 'uploaded.png',
          image_url: 'http://localhost:3000/images/uploaded.png',
          total_detections: 1,
          detections: [
            { class_name: 'spur', confidence: 0.99, bbox: [5, 5, 15, 15] }
          ]
        }
      ]
    });
  })
];
