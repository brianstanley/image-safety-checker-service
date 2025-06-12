import { Request, Response } from 'express';
import { imageService } from '../services/image.service';
import { ImageCheckRequest } from '../types';

export const checkImage = async (req: Request, res: Response) => {
  try {
    const request: ImageCheckRequest = req.body;
    
    if (!request.imageUrl) {
      return res.status(400).json({
        message: 'Image URL is required',
        status: 400
      });
    }

    const result = await imageService.checkImage(request);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Internal server error',
      status: 500
    });
  }
}; 