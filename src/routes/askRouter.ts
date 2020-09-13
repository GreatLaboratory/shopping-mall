import { Router } from 'express';

import { askUploader } from './middleWares/uploader';
import { ask, reply, deleteAsk, forUser, forMarket, forProduct, totalAsk } from '../controllers/askController';
import { verifyJwtToken } from './middleWares/authValidation';

class AskRouter {
    public router: Router;

    constructor () {
        this.router = Router();
        this.routes();
    }

    private routes (): void {
        // 문의 등록하기
        this.router.post('/', verifyJwtToken, askUploader.single('image'), ask);
    
        // 문의 답변하기
        this.router.put('/reply', reply);

        // 문의 삭제하기
        this.router.delete('/:askId', deleteAsk);

        // 사용자가 자신이 문의한 내역 조회하기
        this.router.get('/forUser/:page', verifyJwtToken, forUser);

        // 마켓이 자신의 상품 문의 내역 조회하기
        this.router.get('/forMarket/:marketId/:page', forMarket);
        
        // 상품 상세보기에서 해당 상품의 문의 내역 조회하기
        this.router.get('/forProduct/:productId/:page', forProduct);
    
        // 전체 문의 조회하기
        this.router.get('/totalAsk/:page', totalAsk);
    }
}

const askRouter = new AskRouter();
export default askRouter.router;
