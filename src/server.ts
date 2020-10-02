import 'dotenv/config';

import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import errorHandler from 'errorhandler';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import mongoose, { Error } from 'mongoose';
import morgan from 'morgan';
import passport from 'passport';

import { MONGODB_URI, JWT_SECRET } from './config/secret';
import { passportConfig } from './config/passport';
import marketRouter from './routes/marketRouter';
import userRouter from './routes/userRouter';
import productRouter from './routes/productRouter';
import adminRouter from './routes/adminRouter';
import orderRouter from './routes/orderRouter';
import askRouter from './routes/askRouter';
import noticeRouter from './routes/noticeRouter';
import reviewRouter from './routes/reviewRouter';
import tossRouter from './routes/tossRouter';
import kakaopayRouter from './routes/kakaopayRouter';
import eventRouter from './routes/eventRouter';
import bargainRouter from './routes/bargainRouter';
import returnRouter from './routes/returnRouter';
import couponRouter from './routes/couponRouter';
class Server {
    // Express App 필드 선언
    private app: Application;

    // 생성자
    constructor () {
        this.app = express();
        this.connectDB();
        this.config();
        passportConfig(passport);
        this.routes();
    }

    // DB 연결
    private connectDB (): void {
        const connect = async () => {
            await mongoose.connect(MONGODB_URI, {
                dbName : 'mansbuy',
                useFindAndModify: false,
                useNewUrlParser: true,
                useCreateIndex: true,
                useUnifiedTopology: true
            }, (error: Error) => {
                if (error) console.error('몽고디비 연결 에러', error);
                else console.log('몽고디비 연결 성공');
            });
        };
        connect();
        mongoose.connection.on('error', (error: Error) => {
            console.log('몽고디비 연결 에러', error);
        });
        mongoose.connection.on('disconnected', () => {
            console.log('몽고디비 연결이 끊겼습니다. 연결을 재시도합니다.');
            connect();
        });
    }

    // 기본 서버 설정 및 미들웨어 
    private config (): void {
        if (process.env.NODE_ENV === 'production') {
            this.app.use(morgan('combined'));
            this.app.use(helmet());
            this.app.use(hpp());
            this.app.use(compression());
        } else {
            this.app.use(morgan('dev'));
        }
        this.app.use(cors({
            origin: true,
            credentials: true
        }));
        this.app.use(express.json({
            limit: '200mb'
        }));
        this.app.use(express.static('public'));
        this.app.use(express.urlencoded({
            extended: false, 
            limit: '200mb'
        }));
        this.app.use(cookieParser(JWT_SECRET));
        this.app.use(passport.initialize());
    }

    // 라우터
    private routes (): void {
        this.app.use('/api/market', marketRouter);
        this.app.use('/api/user', userRouter);
        this.app.use('/api/product', productRouter);
        this.app.use('/api/order', orderRouter);
        this.app.use('/api/admin', adminRouter);
        this.app.use('/api/ask', askRouter);
        this.app.use('/api/notice', noticeRouter);
        this.app.use('/api/review', reviewRouter);
        this.app.use('/api/toss', tossRouter);
        this.app.use('/api/kakaopay', kakaopayRouter);
        this.app.use('/api/event', eventRouter);
        this.app.use('/api/bargain', bargainRouter);
        this.app.use('/api/return', returnRouter);
        this.app.use('/api/coupon', couponRouter);
    }

    // 서버 구동
    public start (): void {
        this.app.use(errorHandler());
        this.app.listen(3000, () => {
            console.log('####### App is running!! #######');
        });
        this.app.get('/health', (req: Request, res: Response) => {
            res.status(200).send();
        });
    }
}

const server: Server = new Server();
server.start();
