import { bootstrapKit } from '../../../../packages/ui-bootstrap/src/index';
import { muiKit } from '../../../../packages/ui-mui/src/index';
import { shadcnKit } from '../../../../packages/ui-shadcn/kit';
import { tailwindKit } from '../../../../packages/ui-tailwind/src/index';
import { describeKitConformance } from './conformance';

describeKitConformance(bootstrapKit);
describeKitConformance(muiKit);
describeKitConformance(tailwindKit);
describeKitConformance(shadcnKit);
