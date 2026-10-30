import { Router, type IRouter } from "express";
import authRouter from "./auth";
import healthRouter from "./health";
import walletsRouter from "./wallets";
import faucetRouter from "./faucet";
import transferRouter from "./transfer";
import transactionsRouter from "./transactions";
import adminRouter from "./admin";
import { requireAdmin, requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(requireAuth);
router.use(walletsRouter);
router.use(faucetRouter);
router.use(transferRouter);
router.use(transactionsRouter);
router.use(requireAdmin, adminRouter);

export default router;
