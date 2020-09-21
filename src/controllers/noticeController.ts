import { Request, Response, NextFunction } from 'express';

import { Product, ProductDocument } from '../models/product/Product';
import { Notice, NoticeDocument } from '../models/info/Notice';

// POST -> 공지사항 등록하기
export const addNotice = async (req: Request, res: Response, next: NextFunction) => {
    const { marketId, title, content } = req.body;
    try {
        const notice: NoticeDocument | null = await Notice.findOne({ title, content });
        if (notice) {
            res.status(400).json({ message: '해당하는 제목과 내용의 공지사항이 이미 존재합니다.'});
        } else {
            await Notice.create({ marketId, title, content });
            res.status(201).json({ message: '공지사항이 정상적으로 등록되었습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 공지사항 수정하기
export const modifyNotice = async (req: Request, res: Response, next: NextFunction) => {
    const { noticeId, title, content } = req.body;
    try {
        await Notice.findByIdAndUpdate(noticeId, { title, content });
        res.status(201).json({ message: '공지사항이 정상적으로 수정되었습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
}; 

// DELETE -> 공지사항 삭제하기
export const deleteNotice = async (req: Request, res: Response, next: NextFunction) => {
    const { noticeId } = req.params;
    try {
        await Notice.findByIdAndDelete(noticeId);
        res.status(201).json({ message: '공지사항이 정상적으로 삭제되었습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
}; 

// GET -> 마켓관리 패널에서 공지사항 목록 조회하기
export const forMarket = async (req: Request, res: Response, next: NextFunction) => {
    const { marketId } = req.params;
    try {
        const noticeList: NoticeDocument[] = await Notice.find({ marketId });
        res.status(200).json(noticeList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 상품 상세보기에서 공지사항 목록 조회하기
export const forProduct = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    try {
        const product: ProductDocument | null = await Product.findById(productId);
        if (product) {
            const noticeList: NoticeDocument[] = await Notice.find({ marketId: product.marketId });
            res.status(200).json(noticeList);
        } else {
            res.status(404).json({ message: '해당하는 아이디의 상품이 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 슈퍼 관리자 패널에서 공지사항 목록 조회하기
export const forAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const noticeList: NoticeDocument[] = await Notice.find().where('marketId').exists(false);
        res.status(200).json(noticeList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};
