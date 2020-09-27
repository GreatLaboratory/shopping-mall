import { Router } from 'express';

import { returnUploader } from './middleWares/uploader';
import { exchange, refund, getExchangeInfo, getRefundInfo, completeReturn, getReturnList } from '../controllers/returnController';
import { verifyJwtToken } from './middleWares/authValidation';

class ReturnRouter {
    public router: Router;

    constructor () {
        this.router = Router();
        this.routes();
    }

    private routes (): void {
        // POST -> 소비자가 교환 신청하기
        this.router.post('/exchange', returnUploader.single('image'), exchange);
        
        // POST -> 소비자가 환불 신청하기
        this.router.post('/refund', returnUploader.single('image'), refund);
        
        // GET -> 판매자가 교환 내용 조회하기
        this.router.get('/exchange/:exchangeId', getExchangeInfo);
        
        // GET -> 판매자가 환불 내용 조회하기
        this.router.get('/refund/:refundId', getRefundInfo);
        
        // PUT -> 판매자가 교환 또는 환불 수락하기
        this.router.put('/complete', completeReturn);
        
        // GET -> 사용자의 교환&환불 목록 조회하기
        this.router.get('/list', verifyJwtToken, getReturnList);
    
    }
}

const returnRouter = new ReturnRouter();
export default returnRouter.router;
