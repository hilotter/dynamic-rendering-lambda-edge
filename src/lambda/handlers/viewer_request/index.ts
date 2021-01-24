import { CloudFrontRequestEvent, Context, Callback } from 'aws-lambda'

export const handler = async (event: CloudFrontRequestEvent, _context: Context, callback: Callback): Promise<void> => {
  const dynamicRenderHeaderName = "X-Need-Dynamic-Render";
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  const crawlers = [
    "Googlebot",
    "facebookexternalhit",
    "Twitterbot",
    "bingbot",
    "msnbot",
    "Slackbot-LinkExpanding",
  ];

  const isCrawler = crawlers.some(c => {
    return headers["user-agent"][0].value.includes(c);
  });

  let isHtml = request.uri === null || request.uri === "/"
  const path = request.uri.split("?").shift()
  if (path) {
    isHtml = !path.includes('.')
  }

  if (isCrawler && isHtml) {
    request.headers[dynamicRenderHeaderName.toLowerCase()] = [
      {
        key: dynamicRenderHeaderName,
        value: "true"
      }
    ];
  }

  callback(null, request);
}
