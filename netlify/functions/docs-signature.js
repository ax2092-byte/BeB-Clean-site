const { crypto } = require('./_lib');

exports.handler = async (event) => {
  try{
    const { folder='partners', public_id='' } = JSON.parse(event.body||'{}');
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
    const api_key = process.env.CLOUDINARY_API_KEY;
    const api_secret = process.env.CLOUDINARY_API_SECRET;
    const timestamp = Math.floor(Date.now()/1000);

    const params = [ folder ? `folder=${folder}` : null, public_id ? `public_id=${public_id}` : null, `timestamp=${timestamp}` ].filter(Boolean).join('&');
    const signature = crypto.createHash('sha1').update(params + api_secret).digest('hex');

    return { statusCode:200, body: JSON.stringify({ cloud_name, api_key, timestamp, signature, folder }) };
  }catch(e){ return { statusCode:500, body:String(e) }; }
};
