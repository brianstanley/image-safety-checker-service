import { Request, Response } from 'express';
import { UsageModel } from '../models/usage.model';

export const resetUsage = async (req: Request, res: Response) => {
  try {
    const { serviceName, month } = req.body;

    if (!serviceName || !month) {
      return res.status(400).json({
        message: 'Service name and month are required',
        status: 400
      });
    }

    const result = await UsageModel.findOneAndUpdate(
      { serviceName, month },
      { requestsUsed: 0 },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        message: 'Usage record not found',
        status: 404
      });
    }

    res.json({
      message: 'Usage reset successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Internal server error',
      status: 500
    });
  }
}; 