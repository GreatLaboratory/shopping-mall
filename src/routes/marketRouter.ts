import { Router, Request, Response } from 'express';

import { login, signUp, modifyMarketInfo, getNewFourMarkets, getNewTwentyMarketList, getBestMarketList, getMarket, deleteMarket, resetPassword, getSavedModelInfo } from '../controllers/marketController';
import { marketUploader } from '../routes/middleWares/uploader';

class MarketRouter {
    public router: Router;

    constructor () {
        this.router = Router();
        this.routes();
    }

    private routes (): void {
        // 입점 관리자 로컬 로그인하기
        this.router.post('/login', login, (req: Request, res: Response) => {
            console.log(req.user);
            res.json(req.user);
        });

        // 회원가입하기
        this.router.post('/signUp', marketUploader.fields([{ name: 'business' }, { name: 'telemarket' }, { name: 'bankbook' }]), signUp);

        // 비밀번호 찾기
        this.router.post('/resetPassword', resetPassword);

        // 마켓 정보 수정하기
        this.router.put('/modify', login, modifyMarketInfo);
        
        // 서비스 홈 화면에서 최근 마켓 4개 조회
        this.router.get('/newFour', getNewFourMarkets);
        
        // 서비스 홈 화면에서 최근 마켓 20개 조회
        this.router.get('/newTwenty', getNewTwentyMarketList);
        
        // 하단 마켓 탭 눌렀을 때 판매량 순으로 마켓 조회
        this.router.get('/bestList/:page', getBestMarketList);
        
        // 마켓 상세조회
        this.router.get('/:marketId', getMarket);
        
        // 마켓 삭제하기
        this.router.delete('/:marketId', deleteMarket);
        
        // 마켓이 상품등록할 때 이전에 저장해놓은 모델 정보 조회하기
        this.router.get('/modelInfo/:marketId', getSavedModelInfo);
    }
}

const marketRouter = new MarketRouter();
export default marketRouter.router;
