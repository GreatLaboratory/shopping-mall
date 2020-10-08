import { Request } from 'express';
import AWS, { S3 } from 'aws-sdk';
import multer, { Instance } from 'multer';
import multerS3, { AUTO_CONTENT_TYPE } from 'multer-s3';
import path from 'path';
import { AWS_ACCESS_KEY_ID, AWS_SECRET_KEY_ID, AWS_REGION } from '../config/secret';

const s3: S3 = new AWS.S3({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_KEY_ID,
    region: AWS_REGION,
});

export const productUploader: Instance = multer({
    storage: multerS3({
        s3,
        bucket: 'mans-buy/products',
        acl: 'public-read',
        contentType: AUTO_CONTENT_TYPE,
        metadata: (req: Request, file: Express.Multer.File, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req: Request, file: Express.Multer.File, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, path.basename(file.originalname, ext) + '_mansbuy_' + new Date().valueOf() + ext);
        },
    })
});
export const askUploader: Instance = multer({
    storage: multerS3({
        s3,
        bucket: 'mans-buy/asks',
        acl: 'public-read',
        contentType: AUTO_CONTENT_TYPE,
        metadata: (req: Request, file: Express.Multer.File, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req: Request, file: Express.Multer.File, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, path.basename(file.originalname, ext) + '_mansbuy_' + new Date().valueOf() + ext);
        },
    })
});
export const reviewUploader: Instance = multer({
    storage: multerS3({
        s3,
        bucket: 'mans-buy/reviews',
        acl: 'public-read',
        contentType: AUTO_CONTENT_TYPE,
        metadata: (req: Request, file: Express.Multer.File, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req: Request, file: Express.Multer.File, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, path.basename(file.originalname, ext) + '_mansbuy_' + new Date().valueOf() + ext);
        },
    })
});
export const eventUploader: Instance = multer({
    storage: multerS3({
        s3,
        bucket: 'mans-buy/events',
        acl: 'public-read',
        contentType: AUTO_CONTENT_TYPE,
        metadata: (req: Request, file: Express.Multer.File, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req: Request, file: Express.Multer.File, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, path.basename(file.originalname, ext) + '_mansbuy_' + new Date().valueOf() + ext);
        },
    })
});
export const bargainUploader: Instance = multer({
    storage: multerS3({
        s3,
        bucket: 'mans-buy/bargains',
        acl: 'public-read',
        contentType: AUTO_CONTENT_TYPE,
        metadata: (req: Request, file: Express.Multer.File, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req: Request, file: Express.Multer.File, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, path.basename(file.originalname, ext) + '_mansbuy_' + new Date().valueOf() + ext);
        },
    })
});

export const marketUploader: Instance = multer({
    storage: multerS3({
        s3,
        bucket: 'mans-buy/markets',
        acl: 'public-read',
        contentType: AUTO_CONTENT_TYPE,
        metadata: (req: Request, file: Express.Multer.File, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req: Request, file: Express.Multer.File, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, path.basename(file.originalname, ext) + '_mansbuy_' + new Date().valueOf() + ext);
        },
    })
});
export const returnUploader: Instance = multer({
    storage: multerS3({
        s3,
        bucket: 'mans-buy/returns',
        acl: 'public-read',
        contentType: AUTO_CONTENT_TYPE,
        metadata: (req: Request, file: Express.Multer.File, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req: Request, file: Express.Multer.File, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, path.basename(file.originalname, ext) + '_mansbuy_' + new Date().valueOf() + ext);
        },
    })
});
