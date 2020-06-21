import { CloudFrontRequestEvent, Context, Callback } from 'aws-lambda'
import * as zlib from "zlib"
import axios from 'axios'

export const handler = async (event: CloudFrontRequestEvent, _context: Context, callback: Callback): Promise<void> => {
  const dynamicRenderHeaderName = "X-Need-Dynamic-Render"
  const request = event.Records[0].cf.request

  const origin = request.origin
  if (!origin) {
    return callback(null, request)
  }
  const custom = origin.custom
  if (!custom) {
    return callback(null, request)
  }

  // override host for NoSuchBucket error
  const headers = request.headers
  const host = headers.host[0].value

  const s3host = custom.domainName
  request.headers["host"] = [{ key: "host", value: s3host }]

  if (!headers[dynamicRenderHeaderName.toLowerCase()]) {
    return callback(null, request)
  }

  // for crawler
  try {
    const targetUrl = `https://${host}${request.uri}`

    // Note: Lambda@Edge can not use environment variables
    // Convert to inline string using transform-inline-environment-variables (.babelrc)
    const dynamicRenderingApi = process.env.DYNAMIC_RENDERING_API_URL
    const dynamicRenderingApiKey = process.env.DYNAMIC_RENDERING_API_KEY

    const res = await axios.get(
      `${dynamicRenderingApi}?url=${targetUrl}`,
      {
        params: {
          url: targetUrl,
        },
        headers: { 'x-api-key': dynamicRenderingApiKey },
      }
    )
    const html = res.data
    const buffer = zlib.gzipSync(html)
    const base64EncodedBody = buffer.toString("base64")

    const response = {
      status: "200",
      statusDescription: "OK",
      headers: {
        "cache-control": [
          {
            key: "Cache-Control",
            value: "max-age=100",
          },
        ],
        "content-type": [
          {
            key: "Content-Type",
            value: "text/html; charset=utf-8",
          },
        ],
        "content-encoding": [
          {
            key: "Content-Encoding",
            value: "gzip",
          },
        ],
      },
      body: base64EncodedBody,
      bodyEncoding: "base64",
    }

    return callback(null, response)
  } catch (e) {
    console.error(e)
    return callback(e)
  }
}
