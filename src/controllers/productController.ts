import { Request, Response, NextFunction } from 'express';

import { Cart, CartDocument } from '../models/order/Cart';
import { FirstCategory, FirstCategoryDocument } from '../models/category/FirstCategory';
import { Market, MarketDocument } from '../models/user/Market';
import { Model, ModelDocument } from '../models/product/Model';
import { Product, ProductDocument, IResponseProduct } from '../models/product/Product';
import { Quality, QualityDocument } from '../models/product/Quality';
import { SecondCategory } from '../models/category/SecondCategory';
import { Size, SizeDocument } from '../models/product/Size';
import { Stock, StockDocument } from '../models/product/Stock';
import { User, UserDocument } from '../models/user/User';
import { Review, ReviewDocument } from '../models/product/Review';
import { Ask, AskDocument } from '../models/product/Ask';
import { Coupon, CouponDocument } from '../models/benefit/Coupon';
import { Bargain, BargainDocument } from '../models/info/Bargain';

// GET -> 카테고리 목록 조회하기
export const getCategorys = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categorys: FirstCategoryDocument[] = await FirstCategory.find().populate('secondCategoryIdList');
        const resultCategorys: FirstCategoryDocument[] = [];
        for (let i = 0; i < categorys.length; i++) {
            if (categorys[i].name === '아우터') {
                resultCategorys[0] = categorys[i];
            } else if (categorys[i].name === '상의') {
                resultCategorys[1] = categorys[i];
            } else if (categorys[i].name === '하의') {
                resultCategorys[2] = categorys[i];
            } else if (categorys[i].name === '신발') {
                resultCategorys[3] = categorys[i];
            } else if (categorys[i].name === '가방') {
                resultCategorys[4] = categorys[i];
            } else if (categorys[i].name === '잡화') {
                resultCategorys[5] = categorys[i];
            }
        }
        if (categorys.length > 0) {
            res.status(200).json(resultCategorys);
        } else {
            res.status(404).json({ message: '카테고리가 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 상위 카테고리 추가하기
export const addFirstCategory = async (req: Request, res: Response, next: NextFunction) => {
    const { firstCategoryName } = req.body;
    try {
        await FirstCategory.create({ name: firstCategoryName });
        res.status(201).json({ message: '상위 카테고리가 생성되었습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 하위 카테고리 추가하기
export const addSecondCategory = async (req: Request, res: Response, next: NextFunction) => {
    const { firstCategoryName, secondCategoryName } = req.body;
    try {
        const insertedFirstCategory: FirstCategoryDocument | null = await FirstCategory.findOne({ name: firstCategoryName });
        if (insertedFirstCategory) {
            const newSecondCategory = await SecondCategory.create({
                name: secondCategoryName,
                firstCategoryId: insertedFirstCategory._id
            });
            insertedFirstCategory.secondCategoryIdList.push(newSecondCategory._id);
            await insertedFirstCategory.save();
            res.status(201).json({ message: '하위 카테고리가 생성되었습니다.' });
        } else {
            res.status(409).json({ message: '존재하지 않는 상위 카테고리입니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 상품 메인 이미지 업로드하기
export const uploadMainImages = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.body;
    const files = req.files as Express.Multer.File[];
    const mainImages: string[] = [];
    try {
        files.map(img => mainImages.push(`${ img.location }`));
        await Product.findByIdAndUpdate(productId, { mainImages });
        res.status(201).json({ message: '성공적으로 업로드에 성공했습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 상품 서브 이미지 업로드하기
export const uploadSubImages = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.body;
    const files = req.files as Express.Multer.File[];
    const subImages: string[] = [];
    try {
        files.map(img => subImages.push(`${ img.location }`));
        await Product.findByIdAndUpdate(productId, { subImages });
        res.status(201).json({ message: '성공적으로 업로드에 성공했습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 상품정보 등록하기
export const addProduct = async (req: Request, res: Response, next: NextFunction) => {
    const stockIdList: string[] = [];
    const sizeIdList: string[] = [];
    const { marketId, firstCategoryId, secondCategoryId, name, price, discountRate, tags, fabric, modelFitting, coordinateProductIdList, laundry, description, createdAt, sizeList, stockList } = req.body.insertProduct;
    const { an, bi, sin, du, fit } = req.body.insertProduct.quality;
    const { height, weight, top, bottom, shoes } = req.body.insertProduct.model;
    console.log(req.body.insertProduct.sizeList);
    console.log(req.body.insertProduct.stockList);
    try {
        const product: ProductDocument | null = await Product.findOne({ name });
        if (product) {
            res.status(400).json({ message: '해당하는 이름의 상품이 이미 존재합니다.'});
        } else {
            const createSizeIdList = async (sizeList: SizeDocument[]) => { 
                const promises = sizeList.map((size: SizeDocument) => {
                    const { name, total, shoulder, chest, arm, waist, thigh, mitWi, mitDoole, width, length, breadth } = size;
                    const newSize = Size.create({ name, total, shoulder, chest, arm, waist, thigh, mitWi, mitDoole, width, length, breadth });
                    if (newSize) return newSize;
                });
                return await Promise.all(promises);
            };
    
            const resultSizeIdList: any = await createSizeIdList(sizeList);
            for (let i = 0; i < resultSizeIdList.length; i++) {
                sizeIdList.push(resultSizeIdList[i]._id);
            }
    
            const createStockIdList = async (stockList: StockDocument[]) => { 
                const promises = stockList.map((stock: StockDocument) => {
                    const { color, size, optionPrice, stockNum } = stock;
                    const newStock = Stock.create({ color, size, optionPrice, stockNum });
                    if (newStock) return newStock;
                });
                return await Promise.all(promises);
            };
    
            const resultStockIdList: any = await createStockIdList(stockList);
            for (let i = 0; i < resultStockIdList.length; i++) {
                stockIdList.push(resultStockIdList[i]._id);
            }
    
            const quality: QualityDocument = await Quality.create({ an, bi, sin, du, fit });
            const model: ModelDocument = await Model.create({ height, weight, top, bottom, shoes });
            await Market.findById(marketId, async (err, market: MarketDocument) => {
                if (err) console.log(err);
                if (market) {
                    const savedModel: ModelDocument | null = await Model.findById(market.modelId);
                    // 마켓이 이전에 상품을 등록한 적이 있어서 저장해놓은 model정보가 존재할 때
                    if (savedModel) {
                        if (model.height !== savedModel.height || model.weight !== savedModel.weight || model.top !== savedModel.top || model.bottom !== savedModel.bottom || model.shoes !== savedModel.shoes) {
                            market.modelId = model._id;
                            await market.save();
                        }
                    } else {
                        // 마켓이 입점 신청 완료 후 처음으로 상품을 등록할 때
                        market.modelId = model._id;
                        await market.save();
                    }

                    const newProduct: ProductDocument = await Product.create({
                        marketId,
                        firstCategoryId,
                        secondCategoryId,
                        stockIdList,
                        sizeIdList,
                        coordinateProductIdList,
                        qualityId: quality._id,
                        modelId: model._id,
                        name,
                        marketName: market.name,
                        price,
                        discountRate,
                        tags,
                        fabric,
                        modelFitting,
                        laundry,
                        description,
                        rejectReason: '',
                        allowStatus: '판매 심사중',
                        createdAt
                    });
                    const firstCategory: FirstCategoryDocument | null = await FirstCategory.findById(firstCategoryId).select('name');
                    const allProductCouponList: CouponDocument[] = await Coupon.find({ category: '모든 상품 대상 쿠폰' });
                    const firstCategoryProductCouponList: CouponDocument[] = await Coupon.find({ category: `${firstCategory?.name} 상품 대상 쿠폰` });
                    const marketProductCouponList: CouponDocument[] = await Coupon.find({ category: `${market.name} 상품 대상 쿠폰` });

                    allProductCouponList.forEach(async (coupon: CouponDocument) => {
                        coupon.productIdList.push(newProduct._id);
                        await coupon.save();
                    });
                    firstCategoryProductCouponList.forEach(async (coupon: CouponDocument) => {
                        coupon.productIdList.push(newProduct._id);
                        await coupon.save();
                    });
                    marketProductCouponList.forEach(async (coupon: CouponDocument) => {
                        coupon.productIdList.push(newProduct._id);
                        await coupon.save();
                    });

                    stockIdList.map(async (stockId: string) => {
                        const stock: StockDocument | null = await Stock.findById(stockId);
                        if (stock) {
                            stock.productId = newProduct._id;
                            await stock.save();
                        }
                    });
                    sizeIdList.map(async (sizeId: string) => {
                        const size: SizeDocument | null = await Size.findById(sizeId);
                        if (size) {
                            size.productId = newProduct._id;
                            await size.save();
                        }
                    });
                    res.status(200).json({ message: '성공적으로 상품등록이 완료되었습니다.', productId: `${newProduct._id}` });
                } else {
                    res.status(404).json({ message: '해당 마켓이 존재하지 않습니다.' });
                }
            });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 단순정보 수정하기
export const modifyProductInfo = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const { firstCategoryId, secondCategoryId, name, price, discountRate, tags, fabric, modelFitting, removeCoordinateList, addCoordinateList, laundry, description, qualityObj, modelObj } = req.body;
    const { an, bi, sin, du, fit } = qualityObj;
    const { height, weight, top, bottom, shoes } = modelObj;
    try {
        const product: ProductDocument | null = await Product.findOne({ name });
        if (product){
            res.status(400).json({ message : '수정하기 전 이름과 동일합니다.'});
        } else {
            const updatedProduct: ProductDocument | null = await Product.findByIdAndUpdate(productId, {
                firstCategoryId, 
                secondCategoryId, 
                name, 
                price, 
                discountRate, 
                tags, 
                fabric, 
                modelFitting, 
                laundry, 
                description, 
            });
            if (updatedProduct) {
                const removedCoordinateList = updatedProduct.coordinateProductIdList.filter((coordinateProductId: string) => !removeCoordinateList.includes(coordinateProductId.toString()));
                updatedProduct.coordinateProductIdList = [...removedCoordinateList, ...addCoordinateList];
                await updatedProduct.save();
    
                await Model.findByIdAndUpdate(updatedProduct.modelId, { height, weight, top, bottom, shoes });
                await Quality.findByIdAndUpdate(updatedProduct.qualityId, { an, bi, sin, du, fit });
        
                // 상품수정이 이루어질 때 모든 사용자 장바구니에서 해당 상품 제거
                const cartList: CartDocument[] = await Cart.find({ isOrdered: false, productId });
                cartList.forEach(async (cart: CartDocument) => {
                    await cart.remove();
                });
                res.status(201).json({ message: '성공적으로 수정했습니다.' });
            } else {
                res.status(400).json({ message: 'productId에 해당하는 상품이 존재하지 않습니다.' });
            }
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 재고 및 사이즈 정보 수정하기
export const modifyProductStockAndSize = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const { sizeList, stockList } = req.body;
    try {
        const modifyStock = async (stock: StockDocument): Promise<string> => {
            const { color, size, optionPrice, stockNum } = stock;
            const result = await Stock.findOne({ productId, color, size });
            if (result) {
                const updatedStock = await Stock.findByIdAndUpdate(result._id, { optionPrice, stockNum });
                return updatedStock?._id;
            } else {
                const newStock = await Stock.create({ productId, color, size, optionPrice, stockNum });
                return newStock._id;
            }
        };
        const modifySize = async (size: SizeDocument): Promise<string> => {
            const { name, total, shoulder, chest, arm, waist, thigh, mitWi, mitDoole, width, length, breadth } = size;
            const result = await Size.findOne({ productId, name });
            if (result) {
                const updatedSize = await Size.findByIdAndUpdate(result._id, { name, total, shoulder, chest, arm, waist, thigh, mitWi, mitDoole, width, length, breadth });
                return updatedSize?._id;
            } else {
                const newSize = await Size.create({ productId, name, total, shoulder, chest, arm, waist, thigh, mitWi, mitDoole, width, length, breadth });
                return newSize._id;
            }
        };

        const getStockList = async (stockList: StockDocument[]) => {
            const promises = stockList.map(stock => modifyStock(stock));
            return await Promise.all(promises);
        };
        
        const getSizeList = async (sizeList: SizeDocument[]) => {
            const promises = sizeList.map(size => modifySize(size));
            return await Promise.all(promises);
        };

        const stockIdList = await getStockList(stockList);
        const sizeIdList = await getSizeList(sizeList);

        const updatedProduct: ProductDocument | null = await Product.findByIdAndUpdate(productId, { stockIdList, sizeIdList });
        if (updatedProduct) {
            // 상품수정이 이루어질 때 모든 사용자 장바구니에서 해당 상품 제거
            const cartList: CartDocument[] = await Cart.find({ isOrdered: false, productId });
            cartList.forEach(async (cart: CartDocument) => {
                await cart.remove();
            });
            res.status(201).json({ message: '성공적으로 수정했습니다.' });
        }
        else res.status(400).json({ message: 'productId에 해당하는 상품이 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};
// PUT -> 메인 이미지 수정하기
export const modifyProductMainImages = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const removeImages = req.body.removeImages ? req.body.removeImages : [];
    const files = req.files as Express.Multer.File[];
    const addedImages: string[] = [];
    try {
        const product: ProductDocument | null = await Product.findById(productId);
        if (!product) {
            res.status(400).json({ message: '해당하는 아이디의 상품이 존재하지 않습니다.' });
        } else {
            // 상품수정이 이루어질 때 모든 사용자 장바구니에서 해당 상품 제거
            const cartList: CartDocument[] = await Cart.find({ isOrdered: false, productId });
            cartList.forEach(async (cart: CartDocument) => {
                await cart.remove();
            });
            const removedImages = product.mainImages.filter((image: string) => !removeImages.includes(image));
            files.forEach(img => addedImages.push(`${ img.location }`));
            product.mainImages = [...removedImages, ...addedImages];
            await product.save();
        }
        res.status(201).json({ message: '성공적으로 업로드에 성공했습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};
// PUT -> 서브 이미지 수정하기
export const modifyProductSubImages = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const removeImages = req.body.removeImages ? req.body.removeImages : [];
    const files = req.files as Express.Multer.File[];
    const addedImages: string[] = [];
    try {
        const product: ProductDocument | null = await Product.findById(productId);
        if (!product) {
            res.status(400).json({ message: '해당하는 아이디의 상품이 존재하지 않습니다.' });
        } else {
            // 상품수정이 이루어질 때 모든 사용자 장바구니에서 해당 상품 제거
            const cartList: CartDocument[] = await Cart.find({ isOrdered: false, productId });
            cartList.forEach(async (cart: CartDocument) => {
                await cart.remove();
            });
            const removedImages = product.subImages.filter((image: string) => !removeImages.includes(image));
            files.forEach(img => addedImages.push(`${ img.location }`));
            product.subImages = [...removedImages, ...addedImages];
            await product.save();
        }
        res.status(201).json({ message: '성공적으로 업로드에 성공했습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 상품 삭제하기
// TODO: order DB 삭제하기
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.body;
    try {
        const product: ProductDocument | null = await Product.findByIdAndDelete(productId);
        if (product) {
            product.stockIdList.forEach(async (id: string) => await Stock.findByIdAndDelete(id));
            product.sizeIdList.forEach(async (id: string) => await Size.findByIdAndDelete(id));
            await Quality.findByIdAndDelete(product.qualityId);
            await Model.findByIdAndDelete(product.modelId);
            const userList: UserDocument[] = await User.find();
            const cartList: CartDocument[] = await Cart.find({ productId });
            const reviewList: ReviewDocument[] = await Review.find({ productId });
            const askList: AskDocument[] = await Ask.find({ productId });
            const couponList: CouponDocument[]  = await Coupon.find();
            const bargainList: BargainDocument[] = await Bargain.find();
            bargainList.forEach(async (bargain: BargainDocument) => {
                if (bargain.productIdList.includes(productId)) {
                    const idx: number = bargain.productIdList.indexOf(productId);
                    bargain.productIdList.splice(idx, 1);
                    await bargain.save();
                }
            });
            userList.forEach(async (user: UserDocument) => {
                if (user.likeProductIdList.includes(productId)) {
                    const idx: number = user.likeProductIdList.indexOf(productId);
                    user.likeProductIdList.splice(idx, 1);
                    await user.save();
                }
            });
            couponList.forEach(async (coupon: CouponDocument) => {
                if (coupon.productIdList.includes(productId)) {
                    const idx: number = coupon.productIdList.indexOf(productId);
                    coupon.productIdList.splice(idx, 1);
                    await coupon.save();
                }
            });
            cartList.forEach(async (cart: CartDocument) => await cart.remove());
            reviewList.forEach(async (review: ReviewDocument) => await review.remove());
            askList.forEach(async (ask: AskDocument) => await ask.remove());
            res.status(201).json({ message: '성공적으로 삭제했습니다.' });
        } else {
            res.status(400).json({ message: '해당하는 아이디의 상품이 존재하지않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 신규상품 5%OFF 리스트 조회하기
export const getNewProductList = async (req: Request, res: Response, next: NextFunction) => {
    const { page } = req.params;
    const pageNum: number = parseInt(page, 10);
    const resPerPage: number = 12;
    const newLimitDate = new Date().setDate(new Date().getDate() - 7);
    try {
        const productList: ProductDocument[] = await Product.find({ allowStatus: '판매 허가', createdAt: { $gte: newLimitDate } })
            .sort('-createdAt')
            .select('mainImages marketName name price discountRate sales')
            .skip((resPerPage * pageNum) - resPerPage)
            .limit(resPerPage);
        res.status(200).json(productList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 판매량 순으로 상품 리스트 조회하기
export const getBestProductList = async (req: Request, res: Response, next: NextFunction) => {
    const { sort } = req.query;
    const { page } = req.params;
    const pageNum: number = parseInt(page, 10);
    const resPerPage: number = 12;
    try {
        if (sort === 'highPrice') {
            const productList: ProductDocument[] = await Product.find({ allowStatus: '판매 허가' }).select('mainImages marketName name price discountRate sales');
            productList.sort((a: ProductDocument, b: ProductDocument) => b.price * (1 - b.discountRate / 100) - a.price * (1 - a.discountRate / 100));
            const result = productList.slice((pageNum - 1) * resPerPage, pageNum * resPerPage);
            res.status(200).json(result);
        } else if (sort === 'lowPrice') {
            const productList: ProductDocument[] = await Product.find({ allowStatus: '판매 허가' }).select('mainImages marketName name price discountRate sales');
            productList.sort((a: ProductDocument, b: ProductDocument) => a.price * (1 - a.discountRate / 100) - b.price * (1 - b.discountRate / 100));
            const result = productList.slice((pageNum - 1) * resPerPage, pageNum * resPerPage);
            res.status(200).json(result);
        } else if (sort === 'highReview') {
            const productList: ProductDocument[] = await Product.find({ allowStatus: '판매 허가' })
                .sort('-review -sales')
                .select('mainImages marketName name price discountRate sales')
                .skip((resPerPage * pageNum) - resPerPage)
                .limit(resPerPage);
            res.status(200).json(productList);
        } else {
            const productList: ProductDocument[] = await Product.find({ allowStatus: '판매 허가' })
                .sort('-sales')
                .select('mainImages marketName name price discountRate sales')
                .skip((resPerPage * pageNum) - resPerPage)
                .limit(resPerPage);
            res.status(200).json(productList);
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 추천상품 리스트 조회하기 (랜덤뽑기)
export const getRecommendProductList = async (req: Request, res: Response, next: NextFunction) => {
    const { sort } = req.query;
    const { page } = req.params;
    const pageNum: number = parseInt(page, 10);
    const resPerPage: number = 12;
    const random: number = new Date().getDate() % 2 === 0 ? (new Date().getDate() * 3) / 100 : 1 - (new Date().getDate() * 3) / 100;
    try {
        const productList: ProductDocument[] = await Product
            .find({ allowStatus: '판매 허가', createdAt: { $gte: new Date(`${new Date().getFullYear()}-${new Date().getMonth() - 1}-${new Date().getDate()}`) } })
            .select('mainImages marketName name price discountRate sales');
        productList.sort(() => 0.5 - random);
        if (sort === 'highPrice') {
            productList.sort((a: ProductDocument, b: ProductDocument) => b.price * (1 - b.discountRate / 100) - a.price * (1 - a.discountRate / 100));
            const result = productList.slice((pageNum - 1) * resPerPage, pageNum * resPerPage);
            res.status(200).json(result);
        } else if (sort === 'lowPrice') {
            productList.sort((a: ProductDocument, b: ProductDocument) => a.price * (1 - a.discountRate / 100) - b.price * (1 - b.discountRate / 100));
            const result = productList.slice((pageNum - 1) * resPerPage, pageNum * resPerPage);
            res.status(200).json(result);
        } else if (sort === 'highReview') {
            productList.sort((a: ProductDocument, b: ProductDocument) => b.review - a.review);
            const result = productList.slice((pageNum - 1) * resPerPage, pageNum * resPerPage);
            res.status(200).json(result);
        } else if (sort === 'highSales') {
            productList.sort((a: ProductDocument, b: ProductDocument) => b.sales - a.sales);
            const result = productList.slice((pageNum - 1) * resPerPage, pageNum * resPerPage);
            res.status(200).json(result);
        } else {
            const result = productList.slice((pageNum - 1) * resPerPage, pageNum * resPerPage);
            res.status(200).json(result);
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 카테고리별로 상품 목록 조회하기
export const getCategoryProductList = async (req: Request, res: Response, next: NextFunction) => {
    const { firstCategoryId, secondCategoryId, sort } = req.query;
    const { page } = req.params;
    const pageNum: number = parseInt(page, 10);
    const resPerPage: number = 12;
    let productList: ProductDocument[];
    try {
        if (firstCategoryId) {
            if (sort === 'highSales') {
                productList = await Product.find({ firstCategoryId, allowStatus: '판매 허가' })
                    .sort('-sales')
                    .select('marketName mainImages name price discountRate sales')
                    .skip((resPerPage * pageNum) - resPerPage)
                    .limit(resPerPage);
            } else if (sort === 'latest') {
                productList = await Product.find({ firstCategoryId, allowStatus: '판매 허가' })
                    .sort('-createdAt')
                    .select('marketName mainImages name price discountRate sales')
                    .skip((resPerPage * pageNum) - resPerPage)
                    .limit(resPerPage);
            } else {
                productList = await Product.find({ firstCategoryId, allowStatus: '판매 허가' })
                    .select('marketName mainImages name price discountRate sales')
                    .skip((resPerPage * pageNum) - resPerPage)
                    .limit(resPerPage);
            }
        } else {
            if (sort === 'highSales') {
                productList = await Product.find({ secondCategoryId, allowStatus: '판매 허가' })
                    .sort('-sales')
                    .select('marketName mainImages name price discountRate sales')
                    .skip((resPerPage * pageNum) - resPerPage)
                    .limit(resPerPage);
            } else if (sort === 'latest') {
                productList = await Product.find({ secondCategoryId, allowStatus: '판매 허가' })
                    .sort('-createdAt')
                    .select('marketName mainImages name price discountRate sales')
                    .skip((resPerPage * pageNum) - resPerPage)
                    .limit(resPerPage);
            } else {
                productList = await Product.find({ secondCategoryId, allowStatus: '판매 허가' })
                    .select('marketName mainImages name price discountRate sales')
                    .skip((resPerPage * pageNum) - resPerPage)
                    .limit(resPerPage);
            }
        }
        res.status(200).json(productList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 상품 상세보기
export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    try {
        const product: ProductDocument | null = await Product.findById(productId)
            .select('-__v -createdAt -allowStatus -random')
            .populate('firstCategoryId')
            .populate('secondCategoryId')
            .populate('marketId')
            .populate('sizeIdList')
            .populate('stockIdList')
            .populate('qualityId')
            .populate('modelId');
        if (product) {
            const banner: BargainDocument | null = await Bargain.findOne({ bannerImage : product.bannerImage });
            if (banner && banner.endDate.getTime() < Date.now()){
                product.bannerImage = '';
                await product.save();
            }
            res.status(200).json(product);
        }
        else res.status(404).json({ message: '해당하는 아이디의 상품이 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 입점관리자 또는 슈퍼관리자 웹패널에서 상품 목록 조회하기
export const getProductListForAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const { page } = req.params;
    const { marketId, allowStatus } = req.query;
    const pageNum: number = parseInt(page, 10);
    const resPerPage: number = 5;
    let productList: ProductDocument[];
    try {
        if (marketId) {
            productList = await Product.find({ marketId })
                .sort('-createdAt')
                .skip((resPerPage * pageNum) - resPerPage)
                .limit(resPerPage)
                .populate('firstCategoryId')
                .populate('secondCategoryId')
                .populate('marketId')
                .populate('sizeIdList')
                .populate('stockIdList')
                .populate('qualityId')
                .populate('modelId');
        } else {
            if (allowStatus) {
                productList = await Product.find({ allowStatus })
                    .sort('-createdAt')
                    .skip((resPerPage * pageNum) - resPerPage)
                    .limit(resPerPage)
                    .populate('firstCategoryId')
                    .populate('secondCategoryId')
                    .populate('marketId')
                    .populate('sizeIdList')
                    .populate('stockIdList')
                    .populate('qualityId')
                    .populate('modelId');
            } else {
                productList = await Product.find()
                    .sort('-createdAt')                            
                    .skip((resPerPage * pageNum) - resPerPage)
                    .limit(resPerPage)
                    .populate('firstCategoryId')
                    .populate('secondCategoryId')
                    .populate('marketId')
                    .populate('sizeIdList')
                    .populate('stockIdList')
                    .populate('qualityId')
                    .populate('modelId');
            }
        }
        res.status(200).json(productList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 서비스화면에서 마켓페이지에서 BEST상품 4개 조회
export const getBestProductListInMarket = async (req: Request, res: Response, next: NextFunction) => {
    const { marketId } = req.params;
    try {
        const productList: ProductDocument[] = await Product.find({ marketId, allowStatus: '판매 허가' })
            .sort('-sales')
            .select('mainImages marketName name price discountRate sales')
            .limit(4);
        res.status(200).json(productList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 서비스화면에서 마켓페이지에서 카테고리별 상품 조회
export const getCategoryProductListInMarket = async (req: Request, res: Response, next: NextFunction) => {
    const { marketId } = req.params;
    const { sort, firstCategoryId } = req.query;
    let productList: ProductDocument[];
    try {
        if (firstCategoryId) {
            if (sort === 'highSales') {
                productList = await Product.find({ marketId, firstCategoryId, allowStatus: '판매 허가' })
                    .sort('-sales -createdAt')
                    .select('mainImages marketName name price discountRate sales');
            } else {
                productList = await Product.find({ marketId, firstCategoryId, allowStatus: '판매 허가' })
                    .sort('-createdAt')
                    .select('mainImages marketName name price discountRate sales');
            }
        } else {
            if (sort === 'highSales') {
                productList = await Product.find({ marketId, allowStatus: '판매 허가' })
                    .sort('-sales -createdAt')
                    .select('mainImages marketName name price discountRate sales');
            } else {
                productList = await Product.find({ marketId, allowStatus: '판매 허가' })
                    .sort('-createdAt')
                    .select('mainImages marketName name price discountRate sales');
            }
        }
        res.status(200).json(productList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 상품 검색 조회
export const searchProduct = async (req: Request, res: Response, next: NextFunction) => {
    const { page } = req.params;
    const { keyword } = req.query;
    const pageNum: number = parseInt(page, 10);
    const resPerPage: number = 12;
    try {
        if (keyword) {
            const searchProductList: ProductDocument[] = await Product.find({ name: { $regex: keyword, $options: 'i' }, allowStatus: '판매 허가' })
                .select('mainImages marketName name price discountRate sales');

            const productList: ProductDocument[] = await Product.find({ allowStatus: '판매 허가' })
                .select('mainImages marketName name price discountRate tags sales');

            const tagProductList: ProductDocument[] = productList.filter((product: ProductDocument) => {
                const regExp: RegExp = new RegExp(keyword, 'gi');
                const temp: string[] = product.tags.filter((tag: string) => tag.match(regExp) !== null);
                return temp.length !== 0;
            });

            const getUniqueObjectArray = (productList: ProductDocument[]) => {
                return productList.filter((product: ProductDocument, index: number) => {
                    return productList.findIndex((product2: ProductDocument) => {
                        return product.name === product2.name;
                    }) === index;
                });
            };
            const temp = getUniqueObjectArray([...searchProductList, ...tagProductList])
                .sort((a: ProductDocument, b: ProductDocument) => b.sales - a.sales);
                
            const result = temp.slice((pageNum - 1) * resPerPage, pageNum * resPerPage);
            
            res.status(200).json(result);
        } else {
            res.status(400).json({ message: '검색어를 입력해주세요.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 마켓상품 검색 조회
export const searchProductForMarket = async (req: Request, res: Response, next: NextFunction) => {
    const { page } = req.params;
    const { keyword, marketId } = req.query;
    const pageNum: number = parseInt(page, 10);
    const resPerPage: number = 12;
    try {
        if (keyword) {
            const searchProductList: ProductDocument[] = await Product.find({ name: { $regex: keyword, $options: 'i' }, allowStatus: '판매 허가', marketId })
                .select('mainImages marketName name price discountRate sales');

            const productList: ProductDocument[] = await Product.find({ allowStatus: '판매 허가', marketId})
                .select('mainImages marketName name price discountRate tags sales');

            const tagProductList: ProductDocument[] = productList.filter((product: ProductDocument) => {
                const regExp: RegExp = new RegExp(keyword, 'gi');
                const temp: string[] = product.tags.filter((tag: string) => tag.match(regExp) !== null);
                return temp.length !== 0;
            });

            const getUniqueObjectArray = (productList: ProductDocument[]) => {
                return productList.filter((product: ProductDocument, index: number) => {
                    return productList.findIndex((product2: ProductDocument) => {
                        return product.name === product2.name;
                    }) === index;
                });
            };
            const temp = getUniqueObjectArray([...searchProductList, ...tagProductList])
                .sort((a: ProductDocument, b: ProductDocument) => b.sales - a.sales);
                
            const result = temp.slice((pageNum - 1) * resPerPage, pageNum * resPerPage);
            
            res.status(200).json(result);
        } else {
            res.status(400).json({ message: '검색어를 입력해주세요.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 서비스화면에서 룩북 상품리스트 조회하기
export const getLookBookList = async (req: Request, res: Response, next: NextFunction) => {
    const { page } = req.params;
    const pageNum: number = parseInt(page, 10);
    const resPerPage: number = 20;
    try {
        const productList: ProductDocument[] = await Product.find({ allowStatus: '판매 허가', lookBook : true })
            .sort('-lookBookCreatedAt')
            .select('lookBookMainImages')
            .skip((resPerPage * pageNum) - resPerPage)
            .limit(resPerPage);
        res.status(200).json(productList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 관리자 패널에서 룩북 상품리스트 조회하기
export const getLookBookListForAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const { page } = req.params;
    const pageNum: number = parseInt(page, 10);
    const resPerPage: number = 20;
    let resultProdcut: IResponseProduct;
    const resultProductList: IResponseProduct[] = [];
    try {
        const productList: any = await Product.find({ allowStatus: '판매 허가', lookBook : true })
            .select('lookBookMainImages marketName name lookBookCreatedAt marketId')
            .sort('-lookBookCreatedAt')
            .skip((resPerPage * pageNum) - resPerPage)
            .limit(resPerPage)
            .populate('marketId') as any;
            
        for (let i = 0; i < productList.length; i++){
            resultProdcut = {
                lookBookMainImages: productList[i].lookBookMainImages,
                marketName: productList[i].marketName,
                name: productList[i].name,
                lookBookCreatedAt: productList[i].lookBookCreatedAt,
                marketImage: productList[i].marketId.image
            };
            resultProductList.push(resultProdcut);
        }
        res.status(200).json(resultProductList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 룩북 상품 등록하기
export const addLookBook = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const { addCoordinateIdList, createdAt } = req.body;
    try {
        const product: ProductDocument | null = await Product.findById(productId);
        if (product){
            product.lookBook = true;
            product.lookBookCoordinateIdList = addCoordinateIdList;
            product.lookBookCreatedAt = createdAt;
            await product.save();
            res.status(200).json({ message: '성공적으로 룩북등록이 완료되었습니다.', productId: `${product._id}` });
        } else {
            res.status(404).json({ message: '해당하는 아이디의 상품이 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 룩북 상품 정보 수정하기
export const modifyLookBookInfo = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const { removeCoordinateList, addCoordinateList } = req.body;
    try {
        const product: ProductDocument | null = await Product.findById(productId);
        if (product){
            const removedCoordinateList = product.lookBookCoordinateIdList.filter((coordinateProductId: string) => !removeCoordinateList.includes(coordinateProductId.toString()));
            product.lookBookCoordinateIdList = [...removedCoordinateList, ...addCoordinateList];
            await product.save();
            res.status(200).json({ message: '성공적으로 수정했습니다.', productId: `${product._id}` });
        } else {
            res.status(404).json({ message: '해당하는 아이디의 상품이 존재하지 않습니다.' });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 룩북상품 리스트에서 삭제하기
export const deleteLookBook = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    try {
        const product: ProductDocument | null = await Product.findById(productId);
        if (product){
            product.lookBook = false;
            product.lookBookCoordinateIdList = [];
            product.lookBookMainImages = [];
            product.subImages = [];
            product.lookBookCreatedAt = null;
            product.save();
            res.status(201).json({ message: '성공적으로 삭제했습니다.' });
        }
    } catch (err){
        console.log(err);
        next(err);
    }
};

// POST -> 룩북 메인 이미지 업로드하기
export const uploadLookBookMainImages = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.body;
    const files = req.files as Express.Multer.File[];
    const lookBookMainImages: string[] = [];
    try {
        files.map(img => lookBookMainImages.push(`${ img.location }`));
        await Product.findByIdAndUpdate(productId, { lookBookMainImages });
        res.status(201).json({ message: '성공적으로 업로드에 성공했습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// POST -> 룩북 서브 이미지 업로드하기
export const uploadLookBookSubImages = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.body;
    const files = req.files as Express.Multer.File[];
    const lookBookSubImages: string[] = [];
    try {
        files.map(img => lookBookSubImages.push(`${ img.location }`));
        await Product.findByIdAndUpdate(productId, { lookBookSubImages });
        res.status(201).json({ message: '성공적으로 업로드에 성공했습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 룩북 메인 이미지 수정하기
export const modifyLookBookMainImages = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const removeImages = req.body.removeImages ? req.body.removeImages : [];
    const files = req.files as Express.Multer.File[];
    const addedImages: string[] = [];
    try {
        const product: ProductDocument | null = await Product.findById(productId);
        if (!product) {
            res.status(400).json({ message: '해당하는 아이디의 상품이 존재하지 않습니다.' });
        } else {
            // 상품수정이 이루어질 때 모든 사용자 장바구니에서 해당 상품 제거
            const cartList: CartDocument[] = await Cart.find({ isOrdered: false, productId });
            cartList.forEach(async (cart: CartDocument) => {
                await cart.remove();
            });
            const removedImages = product.lookBookMainImages.filter((image: string) => !removeImages.includes(image));
            files.forEach(img => addedImages.push(`${ img.location }`));
            product.lookBookMainImages = [...removedImages, ...addedImages];
            await product.save();
        }
        res.status(201).json({ message: '성공적으로 업로드에 성공했습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 룩북 서브 이미지 수정하기
export const modifyLookBookSubImages = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const removeImages = req.body.removeImages ? req.body.removeImages : [];
    const files = req.files as Express.Multer.File[];
    const addedImages: string[] = [];
    try {
        const product: ProductDocument | null = await Product.findById(productId);
        if (!product) {
            res.status(400).json({ message: '해당하는 아이디의 상품이 존재하지 않습니다.' });
        } else {
            // 상품수정이 이루어질 때 모든 사용자 장바구니에서 해당 상품 제거
            const cartList: CartDocument[] = await Cart.find({ isOrdered: false, productId });
            cartList.forEach(async (cart: CartDocument) => {
                await cart.remove();
            });
            const removedImages = product.lookBookSubImages.filter((image: string) => !removeImages.includes(image));
            files.forEach(img => addedImages.push(`${ img.location }`));
            product.lookBookSubImages = [...removedImages, ...addedImages];
            await product.save();
        }
        res.status(201).json({ message: '성공적으로 업로드에 성공했습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};
