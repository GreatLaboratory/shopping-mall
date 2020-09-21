import { Request, Response, NextFunction } from 'express';
import axios, { AxiosRequestConfig } from 'axios';

import { Cart, CartDocument, IResponseCart } from '../models/order/Cart';
import { Review, ReviewDocument, IResponseReview } from '../models/product/Review';
import { Product, ProductDocument } from '../models/product/Product';
import { User, UserDocument } from '../models/user/User';
import { Market, MarketDocument } from '../models/user/Market';
import { Point } from '../models/benefit/Point';
import { makeSignature, SENS_ACCESS_KEY_ID, SENS_PHONE_NUM, SENS_SERVICE_ID } from '../config/secret';

const resPerPage: number = 10;

// POST -> 리뷰 등록하기
export const review = async (req: Request, res: Response, next: NextFunction) => {
    const { cartId, content, rate, height, weight, footSize, footWidth, wearable, createdAt } = req.body;
    const header: AxiosRequestConfig = { headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-ncp-apigw-timestamp': Date.now().toString(),
        'x-ncp-iam-access-key': SENS_ACCESS_KEY_ID,
        'x-ncp-apigw-signature-v2': makeSignature()
    }};
    const file = req.file as Express.Multer.File;
    const image: string = file ? file.location : '';
    const reivewPoint: number = file ? 300 : 100;
    try {
        const cart: CartDocument | null = await Cart.findById(cartId);
        if (cart) {
            const { userId, productId, marketId } = cart;
            const product: ProductDocument | null = await Product.findById(productId);
            const user: UserDocument | null = await User.findById(userId);
            const market: MarketDocument | null = await Market.findById(marketId);
            if (product) {
                const review: ReviewDocument | null = await Review.findOne({ cartId, content, rate });
                if (review) {
                    res.status(400).json({ message: '해당하는 내용과 평점의 후기가 이미 존재합니다.'});
                } else {
                    const newReview: ReviewDocument = await Review.create({
                        cartId,
                        userId,
                        productId,
                        marketId,
                        image,
                        content,
                        rate,
                        height: height ? height : '',
                        weight: weight ? weight : '',
                        footSize: footSize ? footSize : '',
                        footWidth: footWidth ? footWidth : '',
                        wearable,
                        createdAt
                    });
                    if (user) {
                        user.totalPoint += reivewPoint;
                        user.remainPoint += reivewPoint;
                        await Point.create({ 
                            userId,
                            takeDate: createdAt,
                            takingPoint: reivewPoint,
                            reviewId: newReview._id
                        });
                        await user.save();
                    }
                    product.review += 1;
                    cart.isReviewed = true;
                    await cart.save();
                    await product.save();
                    
                    // 문자 발송
                    if (market){
                        await axios.post(`https://sens.apigw.ntruss.com/sms/v2/services/${SENS_SERVICE_ID}/messages`, {
                            'type': 'SMS',
                            'from': SENS_PHONE_NUM,
                            'content': `안녕하세요 ${market.name}마켓님! 맨즈바이입니다. \n${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}  ${new Date().getHours()}:${new Date().getMinutes()} 신규 후기 1건이 작성되었습니다.`,
                            'messages': [
                                {
                                    'to': market.phone.replace(/-/gi, ''),
                                    'content': `안녕하세요 ${market.name}마켓님! 맨즈바이입니다. \n${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}  ${new Date().getHours()}:${new Date().getMinutes()} 신규 후기 1건이 작성되었습니다.`
                                }
                            ],
                        }, 
                        header);
                    }
                    res.status(201).json({ message: '후기가 등록되었습니다.'});
                }
            } else {
                res.status(404).json({ message: '해당하는 아이디의 상품이 존재하지 않습니다.'});
            }
        } else {
            res.status(404).json({ message: '해당하는 아이디의 주문내역이 존재하지 않습니다.'});
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 리뷰 수정하기
export const updateReview = async (req: Request, res: Response, next: NextFunction) => {
    const { cartId, content, rate, height, weight, footSize, footWidth, wearable, createdAt } = req.body;
    const { reviewId } = req.params;
    try {
        const review: ReviewDocument | null = await Review.findByIdAndUpdate(reviewId, {
            cartId,
            content,
            rate,
            height,
            weight, 
            footSize,
            footWidth, 
            wearable, 
            createdAt
        });
        if (review) res.status(201).json({ message: '성공적으로 후기가 수정되었습니다.' });
        else res.status(400).json({ message: '해당하는 아이디의 후기가 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 리뷰 답변하기
export const reply = async (req: Request, res: Response, next: NextFunction) => {
    const { reviewId, reply } = req.body;
    try {
        const repliedReview: ReviewDocument | null = await Review.findByIdAndUpdate(reviewId, { reply, isReplied: true });
        if (repliedReview) res.status(201).json({ message: '성공적으로 답변이 등록되었습니다.' });
        else res.status(404).json({ message: '해당하는 아이디의 문의사항이 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 후기 작성 가능한 주문 목록 조회하기
export const getOrderList = async (req: Request, res: Response, next: NextFunction) => {
    const { page } = req.params;
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    const resultCartList: IResponseCart[] = [];
    let resultCart: IResponseCart;
    const pageNum: number = parseInt(page, 10);
    try {
        const cartList: CartDocument[] = await Cart.find({ userId, isOrdered: true, isReviewed: false, status: '구매 확정' })
            .select('productId color size')
            .skip((resPerPage * pageNum) - resPerPage)
            .limit(resPerPage);
        const getProducts = async (cartList: CartDocument[]) => { 
            const promises = cartList.map((cart: CartDocument) => {
                const { productId } = cart;
                const product = Product.findById(productId).select('-_id mainImages marketName name firstCategoryId');
                if (product) return product; 
            });
            return await Promise.all(promises); 
        };
        const productList: any = await getProducts(cartList);
        for (let i = 0; i < cartList.length; i++) {
            resultCart = {
                cartId: cartList[i]._id,
                color: cartList[i].color,
                size: cartList[i].size,
                mainImage: productList[i].mainImages[0],
                marketName: productList[i].marketName,
                productName: productList[i].name,
                firstCategoryId: productList[i].firstCategoryId
            };
            resultCartList.push(resultCart);
        }
        res.status(200).json(resultCartList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// Get -> 사용자가 자신이 후기 남긴 내역 조회하기
export const forUser = async (req: Request, res: Response, next: NextFunction) => {
    const { page } = req.params;
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    const resultReviewList: IResponseReview[] = [];
    let resultReview: IResponseReview;
    const pageNum: number = parseInt(page, 10);
    try {
        const reviewList: ReviewDocument[] = await Review.find({ userId })
            .sort('-createdAt')
            .skip((resPerPage * pageNum) - resPerPage)
            .limit(resPerPage);

        const getProducts = async (reviewList: ReviewDocument[]) => { 
            const promises = reviewList.map((review: ReviewDocument) => {
                const { productId } = review;
                const product = Product.findById(productId).select('-_id mainImages name');
                if (product) return product; 
            });
            return await Promise.all(promises); 
        };

        const getMarkets = async (reviewList: ReviewDocument[]) => { 
            const promises = reviewList.map((review: ReviewDocument) => {
                const { marketId } = review;
                const market = Market.findById(marketId).select('-_id name image');
                if (market) return market; 
            });
            return await Promise.all(promises); 
        };

        const getCarts = async (reviewList: ReviewDocument[]) => { 
            const promises = reviewList.map((review: ReviewDocument) => {
                const { cartId } = review;
                const cart = Cart.findOne({ _id: cartId, isOrdered: true }).select('-_id color size');
                if (cart) return cart;
            });
            return await Promise.all(promises);
        };

        const productList: any = await getProducts(reviewList);
        const marketList: any = await getMarkets(reviewList);
        const cartList: any = await getCarts(reviewList);
        
        for (let i = 0; i < reviewList.length; i++) {
            resultReview = {
                review: reviewList[i],
                mainImage: productList[i].mainImages[0],
                marketImage: marketList[i].image,
                marketName: marketList[i].name,
                productName: productList[i].name,
                color: cartList[i].color,
                size: cartList[i].size
            };
            resultReviewList.push(resultReview);
        }
        res.status(200).json(resultReviewList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 상품 상세보기에서 전체리뷰 목록 조회하기
export const forProduct = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const resultImageReviewList: IResponseReview[] = [];
    const resultNormalReviewList: IResponseReview[] = [];
    let resultImageReview: IResponseReview;
    let resultNormalReview: IResponseReview;
    try {
        const reviewList: ReviewDocument[] = await Review.find({ productId });
        const totalReviewNum: number = reviewList.length;
        if (totalReviewNum === 0) {
            res.status(200).json([]);
        } else {
            const avgRate: number = parseFloat((reviewList.map(review => review.rate).reduce((acc, val) => acc + val) / totalReviewNum).toFixed(2));
            const goodWearableNum: number = reviewList.filter(review => review.wearable === '잘 맞아요').length;
            const goodWearablePercent: number = parseInt(((goodWearableNum / totalReviewNum) * 100).toFixed(0));
            const imageReviewNum: number = (await Review.find({ productId }).ne('image', '')).length;
            const normalReviewNum: number = (await Review.find({ productId }).where('image').equals('')).length;
            const imageReviewList: ReviewDocument[] = await Review.find({ productId }).ne('image', '').sort('-createdAt').limit(2);
            const normalReviewList: ReviewDocument[] = await Review.find({ productId }).where('image').equals('').sort('-createdAt').limit(2);
    
            const getReviewUsers = async (reviewList: ReviewDocument[]) => { 
                const promises = reviewList.map((review: ReviewDocument) => {
                    const { userId } = review;
                    const user = User.findById(userId).select('-_id name');
                    if (user) return user;
                }); 
                return await Promise.all(promises); 
            };
    
            const getReviewCarts = async (reviewList: ReviewDocument[]) => { 
                const promises = reviewList.map((review: ReviewDocument) => {
                    const { cartId } = review;
                    const cart = Cart.findOne({ _id: cartId, isOrdered: true }).select('-_id color size');
                    if (cart) return cart;
                });
                return await Promise.all(promises);
            };
    
            const imageUserList: any = await getReviewUsers(imageReviewList);
            const imageCartList: any = await getReviewCarts(imageReviewList);
            const normalUserList: any = await getReviewUsers(normalReviewList);
            const normalCartList: any = await getReviewCarts(normalReviewList);
    
            for (let i = 0; i < imageReviewList.length; i++) {
                resultImageReview = {
                    review: imageReviewList[i],
                    userName: imageUserList[i].name, 
                    color: imageCartList[i].color,
                    size: imageCartList[i].size
                };
                resultImageReviewList.push(resultImageReview);
            }
            for (let i = 0; i < normalReviewList.length; i++) {
                resultNormalReview = {
                    review: normalReviewList[i],
                    userName: normalUserList[i].name, 
                    color: normalCartList[i].color,
                    size: normalCartList[i].size
                };
                resultNormalReviewList.push(resultNormalReview);
            }
    
            res.status(200).json({ 
                imageReviewList: resultImageReviewList,
                normalReviewList: resultNormalReviewList,
                totalReviewNum: totalReviewNum,
                imageReviewNum: imageReviewNum,
                normalReviewNum: normalReviewNum,
                avgRate: avgRate, 
                goodWearablePercent: goodWearablePercent 
            });
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 상품 상세보기에서 포토리뷰 목록 조회하기
export const forImageReview = async (req: Request, res: Response, next: NextFunction) => {
    const { productId, page } = req.params;
    const { isRating } = req.query;
    const resultImageReviewList: IResponseReview[] = [];
    let resultImageReview: IResponseReview;
    const pageNum: number = parseInt(page, 10);
    let imageReviewList: ReviewDocument[];
    try {
        if (isRating === undefined) imageReviewList = await Review.find({ productId }).ne('image', '').sort('-createdAt').skip((resPerPage * pageNum) - resPerPage).limit(resPerPage); 
        else if (isRating === 'true') imageReviewList = await Review.find({ productId }).ne('image', '').sort('-rate -createdAt').skip((resPerPage * pageNum) - resPerPage).limit(resPerPage);
        else if (isRating === 'false') imageReviewList = await Review.find({ productId }).ne('image', '').sort('rate -createdAt').skip((resPerPage * pageNum) - resPerPage).limit(resPerPage);
        else imageReviewList = [];
        const totalReviewNum: number = (await Review.find({ productId }).ne('image', '')).length;

        const getReviewUsers = async (reviewList: ReviewDocument[]) => { 
            const promises = reviewList.map((review: ReviewDocument) => {
                const { userId } = review;
                const user = User.findById(userId).select('-_id name');
                if (user) return user;
            });
            return await Promise.all(promises); 
        };

        const getReviewCarts = async (reviewList: ReviewDocument[]) => { 
            const promises = reviewList.map((review: ReviewDocument) => {
                const { cartId } = review;
                const cart = Cart.findOne({ _id: cartId, isOrdered: true }).select('-_id color size');
                if (cart) return cart;
            });
            return await Promise.all(promises);
        };

        const imageUserList: any = await getReviewUsers(imageReviewList);
        const imageCartList: any = await getReviewCarts(imageReviewList);

        for (let i = 0; i < imageReviewList.length; i++) {
            resultImageReview = {
                review: imageReviewList[i],
                userName: imageUserList[i].name, 
                color: imageCartList[i].color,
                size: imageCartList[i].size
            };
            resultImageReviewList.push(resultImageReview);
        }

        res.status(200).json({
            imageReviewList: resultImageReviewList,
            totalReviewNum: totalReviewNum
        });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 상품 상세보기에서 일반리뷰 목록 조회하기
export const forNormalReview = async (req: Request, res: Response, next: NextFunction) => {
    const { productId, page } = req.params;
    const { isRating } = req.query;
    const resultNormalReviewList: IResponseReview[] = [];
    let resultNormalReview: IResponseReview;
    const pageNum: number = parseInt(page, 10);
    let normalReviewList: ReviewDocument[];
    try {
        if (isRating === undefined) normalReviewList = await Review.find({ productId }).where('image').equals('').sort('-createdAt').skip((resPerPage * pageNum) - resPerPage).limit(resPerPage); 
        else if (isRating === 'true') normalReviewList = await Review.find({ productId }).where('image').equals('').sort('-rate -createdAt').skip((resPerPage * pageNum) - resPerPage).limit(resPerPage);
        else if (isRating === 'false') normalReviewList = await Review.find({ productId }).where('image').equals('').sort('rate -createdAt').skip((resPerPage * pageNum) - resPerPage).limit(resPerPage);
        else normalReviewList = [];
        const totalReviewNum: number = (await Review.find({ productId }).where('image').equals('')).length;

        const getReviewUsers = async (reviewList: ReviewDocument[]) => { 
            const promises = reviewList.map((review: ReviewDocument) => {
                const { userId } = review;
                const user = User.findById(userId).select('-_id name');
                if (user) return user;
            });
            return await Promise.all(promises); 
        };

        const getReviewCarts = async (reviewList: ReviewDocument[]) => { 
            const promises = reviewList.map((review: ReviewDocument) => {
                const { cartId } = review;
                const cart = Cart.findOne({ _id: cartId, isOrdered: true }).select('-_id color size');
                if (cart) return cart;
            });
            return await Promise.all(promises);
        };

        const normalUserList: any = await getReviewUsers(normalReviewList);
        const normalCartList: any = await getReviewCarts(normalReviewList);

        for (let i = 0; i < normalReviewList.length; i++) {
            resultNormalReview = {
                review: normalReviewList[i],
                userName: normalUserList[i].name, 
                color: normalCartList[i].color,
                size: normalCartList[i].size
            };
            resultNormalReviewList.push(resultNormalReview);
        }

        res.status(200).json({
            normalReviewList: resultNormalReviewList,
            totalReviewNum: totalReviewNum
        });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 판매자 패널에서 리뷰 목록 조회하기
export const forMarket = async (req: Request, res: Response, next: NextFunction) => {
    const { marketId, page } = req.params;
    const resultReviewList: IResponseReview[] = [];
    let resultReview: IResponseReview;
    const pageNum: number = parseInt(page, 10);
    try {
        const reviewList: ReviewDocument[] = await Review.find({ marketId }).skip((resPerPage * pageNum) - resPerPage).limit(resPerPage);

        const getProducts = async (reviewList: ReviewDocument[]) => { 
            const promises = reviewList.map((review: ReviewDocument) => {
                const { productId } = review;
                const product = Product.findById(productId).select('-_id mainImages name');
                if (product) return product; 
            }); 
            return await Promise.all(promises); 
        };

        const getCarts = async (reviewList: ReviewDocument[]) => { 
            const promises = reviewList.map((review: ReviewDocument) => {
                const { cartId } = review;
                const cart = Cart.findOne({ _id: cartId, isOrdered: true }).select('-_id color size');
                if (cart) return cart;
            });
            return await Promise.all(promises);
        };

        const getUsers = async (reviewList: ReviewDocument[]) => { 
            const promises = reviewList.map((review: ReviewDocument) => {
                const { userId } = review;
                const user = User.findById(userId).select('-_id name');
                if (user) return user;
            });
            return await Promise.all(promises);
        };

        const productList: any = await getProducts(reviewList);
        const cartList: any = await getCarts(reviewList);
        const userList: any = await getUsers(reviewList);

        for (let i = 0; i < reviewList.length; i++) {
            resultReview = {
                review: reviewList[i],
                mainImage: productList[i].mainImages[0],
                userName: userList[i].name,
                productName: productList[i].name,
                color: cartList[i].color,
                size: cartList[i].size
            };
            resultReviewList.push(resultReview);
        }
        res.status(200).json(resultReviewList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 관리자 페이지에서 전체 후기 조회하기
export const totalReview = async (req: Request, res: Response, next: NextFunction) => {
    const { marketName } = req.query;
    const { page } = req.params;
    const pageNum: number = parseInt(page, 10);
    const resPerPage: number = 10;
    const resultReviewList: IResponseReview[] = [];
    let resultReview: IResponseReview;
    try {
        const getProducts = async (reviewList: ReviewDocument[]) => { 
            const promises = reviewList.map((review: ReviewDocument) => {
                const { productId } = review;
                const product = Product.findById(productId).select('name mainImages');
                if (product) return product; 
            });
            return await Promise.all(promises); 
        };
        const getUsers = async (reviewList: ReviewDocument[]) => { 
            const promises = reviewList.map((review: ReviewDocument) => {
                const { userId } = review;
                const user = User.findById(userId).select('name');
                if (user) return user;
            });
            return await Promise.all(promises); 
        };
        const getMarkets = async (reviewList: ReviewDocument[]) => { 
            const promises = reviewList.map((review: ReviewDocument) => {
                const { marketId } = review;
                const market = Market.findById(marketId).select('name');
                if (market) return market;
            });
            return await Promise.all(promises); 
        };
        const getCarts = async (reviewList: ReviewDocument[]) => { 
            const promises = reviewList.map((review: ReviewDocument) => {
                const { cartId } = review;
                const cart = Cart.findOne({ _id: cartId, isOrdered: true }).select('-_id color size');
                if (cart) return cart;
            });
            return await Promise.all(promises);
        };

        // 마켓이름으로 검색할 경우
        if (marketName){
            const market: MarketDocument | null = await Market.findOne({ name: marketName });
            if (market){
                const marketId: string = market._id; 
    
                const reviewList: ReviewDocument[] | null = await Review.find({ marketId })
                    .sort('-createdAt')
                    .skip((resPerPage * pageNum) - resPerPage)
                    .limit(resPerPage);
    
                const cartList: any = await getCarts(reviewList);
                const productList: any = await getProducts(reviewList);
                const userList: any = await getUsers(reviewList);
    
                for (let i = 0; i < reviewList.length; i++){
                    resultReview = {
                        review: reviewList[i],
                        marketName,
                        productName: productList[i].name,
                        userName: userList[i].name,
                        productImage: productList[i].mainImages[0],
                        color: cartList[i].color,
                        size: cartList[i].size,
                    };
                    resultReviewList.push(resultReview);
                }
                res.status(200).json(resultReviewList);
            } else {
                res.status(404).json({ message: '일치하는 마켓이 존재하지 않습니다.' });
            }
        } else { // 리뷰 전체를 검색 할 경우
            const reviewList: ReviewDocument[] | null = await Review.find()
                .sort('-createdAt')
                .skip((resPerPage * pageNum) - resPerPage)
                .limit(resPerPage);
        
            const productList: any = await getProducts(reviewList);
            const userList: any = await getUsers(reviewList);
            const marketList: any = await getMarkets(reviewList);
            const cartList: any = await getCarts(reviewList);
    
            for (let i = 0; i < reviewList.length; i++){
                resultReview = {
                    review: reviewList[i],
                    marketName: marketList[i].name,
                    productName: productList[i].name,
                    userName: userList[i].name,
                    productImage: productList[i].mainImages[0],
                    color: cartList[i].color,
                    size: cartList[i].size,
                };
                resultReviewList.push(resultReview);
            }
            res.status(200).json(resultReviewList);
        }
    } catch (err) {
        console.error(err);
        next(err);
    }
};
