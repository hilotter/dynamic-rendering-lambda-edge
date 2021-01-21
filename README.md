# Dynamic Rendering Lambda Edge

![dynamic_rendering](https://github.com/hilotter/dynamic-rendering-lambda-edge/raw/master/doc/dynamic_rendering_lambda_edge.png)

- DynamicRenderingApi is [here](https://github.com/hilotter/dynamic-rendering-api)

## Custom settings

```
cp .envrc.sapmle .envrc

export DYNAMIC_RENDERING_API_KEY=API_Key_value_should_be_at_least_20_character
export DYNAMIC_RENDERING_API_URL=https://your-dynamic-rendering-api-url
export S3_BUCKET_NAME=statick_website_bucket_name

# manually create an ACM before deployment
export ACM_CERT_ARN=arn:aws:acm:us-east-1:xxxx
export DOMAIN_NAMES=your-domain,sub.your-domain
```

## CDK deploy

```
yarn
yarn run cdk bootstrap

# dry-run
yarn run cdk diff

# deploy
yarn run deploy
```

## Sample Request

```
# user request
curl https://your-domain'

# crawler request(dynamic rendering)
curl --compressed -H 'User-Agent: Googlebot' 'https://your-domain'
```
