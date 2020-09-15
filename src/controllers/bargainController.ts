import { Request, Response, NextFunction } from 'express';

import { Bargain, BargainDocument } from '../models/info/Bargain';
import { Product, ProductDocument } from '../models/product/Product';

const resPerPage: number = 10;

// POST -> 기획전 등록하기
export const addBargain = async (req: Request, res: Response, next: NextFunction) => {
    const { title, content, startDate, endDate, productIdList } = req.body;
    const file = req.file as Express.Multer.File;
    const bannerImage: string = file ? file.location : '';
    try {
        const bargain: BargainDocument | null = await Bargain.findOne({ title, content, startDate, endDate });
        if (bargain) {
            res.status(400).json({ message: '해당하는 제목과 내용의 기획전이 이미 존재합니다.'});
        } else {
            productIdList.map(async (productId: string) => {
                await Product.findByIdAndUpdate(productId, { bannerImage });
            });
            await Bargain.create({ 
                title, 
                content, 
                startDate, 
                endDate, 
                bannerImage,
                productIdList
            });
            res.status(201).json({ message: '성공적으로 기획전이 등록되었습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 기획전 제품 추가 가능 목록 카테고리별 조회하기
export const getProductList = async (req: Request, res: Response, next: NextFunction) => {
    const { firstCategoryId, secondCategoryId } = req.query;
    const { page } = req.params;
    const pageNum: number = parseInt(page, 10);
    let productList: ProductDocument[];
    try {
        if (firstCategoryId) {
            productList = await Product.find({ firstCategoryId, allowStatus: '판매 허가' })
                .select('marketName mainImages name price discountRate')
                .skip((resPerPage * pageNum) - resPerPage)
                .limit(resPerPage);
        } else {
            productList = await Product.find({ secondCategoryId, allowStatus: '판매 허가' })
                .select('marketName mainImages name price discountRate')
                .skip((resPerPage * pageNum) - resPerPage)
                .limit(resPerPage);
        }
        res.status(200).json(productList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 기획전 수정하기
export const modifyBargain = async (req: Request, res: Response, next: NextFunction) => {
    const { bargainId, title, content, startDate, endDate } = req.body;
    const productIdList: string[] = req.body.productIdList;
    const file = req.file as Express.Multer.File;
    try {
        const bargain: BargainDocument | null = await Bargain.findById(bargainId);
        if (bargain) {
            const bannerImage = file ? file.location : bargain.bannerImage;
            bargain.productIdList.map(async (productId: string) => {
                await Product.findByIdAndUpdate(productId, { bannerImage: '' });
            });
            productIdList.map(async (productId: string) => {
                await Product.findByIdAndUpdate(productId, { bannerImage });
            });
            await Bargain.findByIdAndUpdate(bargainId, {
                title, 
                content, 
                startDate, 
                endDate, 
                bannerImage,
                productIdList
            });
            res.status(201).json({ message: '기획전이 성공적으로 수정되었습니다.' });
        } else {
            res.status(404).json({ message: '해당하는 아이디의 기획전이 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 기획전 삭제하기
export const deleteBargain = async (req: Request, res: Response, next: NextFunction) => {
    const { bargainId } = req.params;
    try {
        const deletedBargain: BargainDocument | null = await Bargain.findByIdAndDelete(bargainId);
        if (deletedBargain) {
            deletedBargain.productIdList.forEach(async (productId: string) => {
                await Product.findByIdAndUpdate(productId, { bannerImage: '' });
            });
            res.status(201).json({ message: '기획전이 성공적으로 삭제되었습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 특정 기획전 조회하기
export const getBargain = async (req: Request, res: Response, next: NextFunction) => {
    const { bargainId } = req.params;
    try {
        const bargain: BargainDocument | null = await Bargain.findById(bargainId);
        const getProducts = async (productIdList: string[]) => { 
            const promises = productIdList.map((productId: string) => {
                const product = Product.findById(productId).select('mainImages marketName name price discountRate sales');
                if (product) return product; 
            });
            return await Promise.all(promises); 
        };
        if (bargain) {
            const productList: any = await getProducts(bargain.productIdList);
            res.status(200).json({bargain: bargain, productList: productList });
        } else {
            res.status(404).json({ message: '해당하는 아이디의 기획전이 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 현재 서비스에 올라가는 기획전 조회하기
export const getServiceBargain = async (req: Request, res: Response, next: NextFunction) => {
    const { page } = req.params;
    const pageNum: number = parseInt(page, 10);
    const resPerPage: number = 24;
    try {
        const bargain: BargainDocument | null = await Bargain.findOne({ startDate: { $lte: Date.now() }, endDate: { $gte: Date.now() } });
        const getProducts = async (productIdList: string[]) => { 
            const promises = productIdList.map((productId: string) => {
                const product = Product.findById(productId).select('mainImages marketName name price discountRate sales');
                if (product) return product; 
            });
            return await Promise.all(promises); 
        };
        if (bargain) {
            const { _id, title, content, startDate, endDate, bannerImage } = bargain;
            const result = bargain.productIdList.slice((pageNum - 1) * resPerPage, pageNum * resPerPage);
            const productList: any = await getProducts(result);
            res.status(200).json({ bargain: { _id, title, content, startDate, endDate, bannerImage }, result: productList });
        } else {
            res.status(404).json({ message: '현재 기획전이 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 기획전 목록 조회하기
export const getBargainList = async (req: Request, res: Response, next: NextFunction) => {
    const { page } = req.params;
    const pageNum: number = parseInt(page, 10);
    try {
        const bargainList: BargainDocument[] = await Bargain.find()
            .select('title content startDate endDate')
            .skip((resPerPage * pageNum) - resPerPage)
            .limit(resPerPage);
        res.status(200).json(bargainList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};
