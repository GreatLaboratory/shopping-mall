import { Router } from 'express';
import { allowMarket, allowProduct, getMarketList, deleteMarket } from '../controllers/adminController';

class AdminRouter {
    public router: Router;

    constructor () {
        this.router = Router();
        this.routes();
    }

    private routes (): void {
        // 입점 허가 or 거부하기
        this.router.post('/allowMarket', allowMarket);

        // 판매 허가 or 거부하기
        this.router.post('/allowProduct', allowProduct);

        // 전체 마켓 리스트 조회하기
        this.router.get('/getMarketList/:page', getMarketList);

        // 마켓 삭제하기
        this.router.delete('/deleteMarket/:marketId', deleteMarket);
    }
}

const adminRouter = new AdminRouter();
export default adminRouter.router;
