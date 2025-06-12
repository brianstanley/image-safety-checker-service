export const SERVICES = {
  SIGHTENGINE: 'sightengine',
  REKOGNITION: 'rekognition'
} as const;

export type ServiceType = typeof SERVICES[keyof typeof SERVICES]; 