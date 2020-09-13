import { Request, Response, NextFunction} from 'express';
import axios, { AxiosRequestConfig } from 'axios';

import { Ask, AskDocument, IResponseAsk } from '../models/product/Ask';
import { Product, ProductDocument } from '../models/product/Product';
import { User } from '../models/user/User';
import { Market, MarketDocument } from '../models/user/Market';
import { UserDocument } from '../models/user/User';
import { makeSignature, SENS_ACCESS_KEY_ID, SENS_PHONE_NUM, SENS_SERVICE_ID } from '../config/secret';

const resPerPage: number = 10;

// POST -> 문의 등록하기
export const ask = async (req: Request, res: Response, next: NextFunction) => {
    const { productId, title, content, isPublic, createdAt } = req.body;
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    const header: AxiosRequestConfig = { headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-ncp-apigw-timestamp': Date.now().toString(),
        'x-ncp-iam-access-key': SENS_ACCESS_KEY_ID,
        'x-ncp-apigw-signature-v2': makeSignature()
    }};
    const file = req.file as Express.Multer.File;
    const image: string = file ? file.location : '';
    try {
        const product: ProductDocument | null = await Product.findById(productId);
        if (product) {
            const marketId: string = product.marketId;
            const ask: AskDocument | null = await Ask.findOne({ title, content, productId, userId });
            if (ask) {
                res.status(400).json({ message: '해당하는 제목과 내용의 문의가 이미 존재합니다.'});
            } else {
                await Ask.create({
                    userId,
                    productId,
                    marketId,
                    image,
                    title,
                    content,
                    isPublic,
                    createdAt
                });
                
                // 문자 발송
                const market: MarketDocument | null = await Market.findById(marketId);
                if (market) {
                    await axios.post(`https://sens.apigw.ntruss.com/sms/v2/services/${SENS_SERVICE_ID}/messages`, {
                        'type': 'SMS',
                        'from': SENS_PHONE_NUM,
                        'content': `안녕하세요 ${market.name}마켓님! 맨즈바이입니다. \n${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}  ${new Date().getHours()}:${new Date().getMinutes()} 신규 문의 1건이 작성되었습니다.`,
                        'messages': [
                            {
                                'to': market.phone.replace(/-/gi, ''),
                                'content': `안녕하세요 ${market.name}마켓님! 맨즈바이입니다. \n${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}  ${new Date().getHours()}:${new Date().getMinutes()} 신규 문의 1건이 작성되었습니다.`
                            }
                        ],
                    }, 
                    header);
                }
                res.status(201).json({ message: '문의사항이 등록되었습니다.'});
            }
        } else {
            res.status(404).json({ message: '해당하는 상품아이디의 상품이 존재하지 않습니다.'});
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// PUT -> 문의 답변하기
export const reply = async (req: Request, res: Response, next: NextFunction) => {
    const { askId, reply } = req.body;
    try {
        const repliedAsk: AskDocument | null = await Ask.findByIdAndUpdate(askId, { reply, isReplied: true });
        if (repliedAsk) res.status(201).json({ message: '성공적으로 답변이 등록되었습니다.' });
        else res.status(404).json({ message: '해당하는 아이디의 문의사항이 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// DELETE -> 문의 삭제하기
export const deleteAsk = async (req: Request, res: Response, next: NextFunction) => {
    const { askId } = req.params;
    try {
        const deletedAsk: AskDocument | null = await Ask.findByIdAndDelete(askId);
        if (deletedAsk) res.status(201).json({ message: '성공적으로 문의사항이 삭제되었습니다.' });
        else res.status(404).json({ message: '해당하는 아이디의 문의사항이 존재하지 않습니다.' });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// Get -> 사용자가 자신이 문의한 내역 조회하기
export const forUser = async (req: Request, res: Response, next: NextFunction) => {
    const { page } = req.params;
    const user: UserDocument = req.user as UserDocument;
    const userId: string = user._id;
    const resultAskList: IResponseAsk[] = [];
    let resultAsk: IResponseAsk;
    const pageNum: number = parseInt(page, 10);
    try {
        const askList: AskDocument[] = await Ask.find({ userId }).sort('-createdAt').skip((resPerPage * pageNum) - resPerPage).limit(resPerPage);

        const getProducts = async (askList: AskDocument[]) => { 
            const promises = askList.map((ask: AskDocument) => {
                const { productId } = ask;
                const product = Product.findById(productId).select('-_id mainImages marketName name');
                if (product) return product; 
            });
            return await Promise.all(promises); 
        };

        const productList: any = await getProducts(askList);

        for (let i = 0; i < askList.length; i++) {
            resultAsk = {
                ask: askList[i],
                productImage: productList[i].mainImages[0],
                marketName: productList[i].marketName,
                productName: productList[i].name,
            };
            resultAskList.push(resultAsk);
        }

        res.status(200).json(resultAskList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// Get -> 마켓이 자신의 상품 문의 내역 조회하기
export const forMarket = async (req: Request, res: Response, next: NextFunction) => {
    const { marketId, page } = req.params;
    const resultAskList: IResponseAsk[] = [];
    let resultAsk: IResponseAsk;
    const pageNum: number = parseInt(page, 10);
    try {
        const askList: AskDocument[] = await Ask.find({ marketId }).sort('-createdAt').skip((resPerPage * pageNum) - resPerPage).limit(resPerPage);
        
        const getProducts = async (askList: AskDocument[]) => { 
            const promises = askList.map((ask: AskDocument) => {
                const { productId } = ask;
                const product = Product.findById(productId).select('-_id mainImages marketName name');
                if (product) return product; 
            });
            return await Promise.all(promises); 
        };

        const getUsers = async (askList: AskDocument[]) => { 
            const promises = askList.map((ask: AskDocument) => {
                const { userId } = ask;
                const user = User.findById(userId).select('-_id name');
                if (user) return user;
            });
            return await Promise.all(promises); 
        };

        const productList: any = await getProducts(askList);
        const userList: any = await getUsers(askList);

        for (let i = 0; i < askList.length; i++) {
            resultAsk = {
                ask: askList[i],
                productImage: productList[i].mainImages[0],
                marketName: productList[i].marketName,
                productName: productList[i].name,
                userName: userList[i].name
            };
            resultAskList.push(resultAsk);
        }
        res.status(200).json(resultAskList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// Get -> 상품 상세보기에서 해당 상품의 문의 내역 조회하기
export const forProduct = async (req: Request, res: Response, next: NextFunction) => {
    const { productId, page } = req.params;
    const resultAskList: IResponseAsk[] = [];
    let resultAsk: IResponseAsk;
    const pageNum: number = parseInt(page, 10);
    try {
        const askList: AskDocument[] = await Ask.find({ productId }).sort('-createdAt').skip((resPerPage * pageNum) - resPerPage).limit(resPerPage);
        
        const getUsers = async (askList: AskDocument[]) => { 
            const promises = askList.map((ask: AskDocument) => {
                const { userId } = ask;
                const user = User.findById(userId).select('-_id name');
                if (user) return user;
            });
            return await Promise.all(promises); 
        };

        const userList: any = await getUsers(askList);

        for (let i = 0; i < askList.length; i++) {
            resultAsk = {
                ask: askList[i],
                userName: userList[i].name
            };
            resultAskList.push(resultAsk);
        }
        res.status(200).json(resultAskList);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

// GET -> 전체 문의 조회하기
export const totalAsk = async (req: Request, res: Response, next: NextFunction) => {
    const { marketName } = req.query;
    const { page } = req.params;
    const pageNum: number = parseInt(page, 10);
    const resPerPage: number = 10;
    const resultAskList: IResponseAsk[] = [];
    let resultAsk: IResponseAsk;
    try {
        const getProducts = async (askList: AskDocument[]) => { 
            const promises = askList.map((ask: AskDocument) => {
                const { productId } = ask;
                const product = Product.findById(productId).select('name mainImages');
                if (product) return product; 
            });
            return await Promise.all(promises); 
        };
        const getUsers = async (askList: AskDocument[]) => { 
            const promises = askList.map((ask: AskDocument) => {
                const { userId } = ask;
                const user = User.findById(userId).select('name');
                if (user) return user;
            });
            return await Promise.all(promises); 
        };
        const getMarkets = async (askList: AskDocument[]) => { 
            const promises = askList.map((ask: AskDocument) => {
                const { marketId } = ask;
                const market = Market.findById(marketId).select('name');
                if (market) return market;
            });
            return await Promise.all(promises); 
        };

        // 마켓이름으로 검색할 경우
        if (marketName){
            const market: MarketDocument | null = await Market.findOne( { name : marketName });
            if (market){
                const marketId: string = market._id; 
    
                const askList: AskDocument[] | null = await Ask.find({ marketId })
                    .sort('-createdAt')
                    .skip((resPerPage * pageNum) - resPerPage)
                    .limit(resPerPage);
    
                const productList: any = await getProducts(askList);
                const userList: any = await getUsers(askList);
    
                for (let i = 0; i < askList.length; i++){
                    resultAsk = {
                        ask: askList[i],
                        marketName,
                        productName: productList[i].name,
                        userName: userList[i].name,
                        productImage: productList[i].mainImages[0]
                    };
                    resultAskList.push(resultAsk);
                }
                res.status(200).json(resultAskList);
            } else {
                res.status(404).json({ message: '일치하는 마켓이 존재하지 않습니다.' });
            }
        // 문의 전체를 검색 할 경우
        } else {
            const askList: AskDocument[] | null = await Ask.find()
                .sort('-createdAt')
                .skip((resPerPage * pageNum) - resPerPage)
                .limit(resPerPage);
        
            const productList: any = await getProducts(askList);
            const userList: any = await getUsers(askList);
            const marketList: any = await getMarkets(askList);

            for (let i = 0; i < askList.length; i++){
                resultAsk = {
                    ask: askList[i],
                    productName: productList[i].name,
                    marketName: marketList[i].name,
                    userName: userList[i].name,
                    productImage: productList[i].mainImages[0]
                };
                resultAskList.push(resultAsk);
            }
            res.status(200).json(resultAskList);
        }
    } catch (err) {
        console.error(err);
        next(err);
    }
};