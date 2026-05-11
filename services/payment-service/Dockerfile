FROM public.ecr.aws/lambda/nodejs:20

WORKDIR ${LAMBDA_TASK_ROOT}

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

CMD ["src/handlers/createOrderHandler.handler"]