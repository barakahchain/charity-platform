# IPFS Setup with Pinata

This project uses **Pinata** for IPFS storage instead of web3.storage. Pinata offers a generous free tier perfect for the MVP.

## Why Pinata?

- ✅ **Free Tier**: 1GB storage + 100GB bandwidth/month
- ✅ **Reliable**: Production-grade infrastructure
- ✅ **Easy Integration**: Simple SDK and API
- ✅ **No Credit Card Required**: Free tier doesn't require payment info
- ✅ **Dedicated Gateway**: Fast content delivery

## Setup Instructions

### 1. Create Pinata Account

1. Go to [Pinata Cloud](https://app.pinata.cloud/register)
2. Sign up for a free account (no credit card needed)
3. Verify your email

### 2. Generate API Key (JWT)

1. Log in to [Pinata Dashboard](https://app.pinata.cloud)
2. Navigate to **API Keys** section (left sidebar)
3. Click **+ New Key**
4. Configure permissions:
   - ✅ `pinFileToIPFS`
   - ✅ `pinJSONToIPFS`
   - ✅ `pinList` (optional)
5. Give it a name like "Charity Escrow MVP"
6. Click **Create Key**
7. **Copy the JWT token** (you won't see it again!)

### 3. Add to Environment Variables

Add the JWT to your `.env` file:

```env
# IPFS - Pinata
PINATA_JWT=your_jwt_token_here
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud
```

### 4. Optional: Dedicated Gateway (Paid Feature)

For production, consider upgrading to get a dedicated gateway:
- Faster content delivery
- Custom domain (e.g., `ipfs.yourcharity.org`)
- No rate limits

**Free tier uses shared gateway**: `https://gateway.pinata.cloud/ipfs/{CID}`

## Usage in Code

The IPFS utility functions remain the same:

```typescript
import { uploadToIPFS, uploadJSONToIPFS, getIPFSGatewayURL } from '@/lib/ipfs';

// Upload file
const cid = await uploadToIPFS(fileBuffer, 'evidence.jpg');

// Upload JSON metadata
const metaCid = await uploadJSONToIPFS({ title: 'Project', description: '...' });

// Get gateway URL
const url = getIPFSGatewayURL(cid); // https://gateway.pinata.cloud/ipfs/{CID}
```

## Free Tier Limits

| Feature | Free Tier |
|---------|-----------|
| Storage | 1 GB |
| Bandwidth | 100 GB/month |
| Files | Unlimited |
| Requests | 100 req/sec |
| Gateway | Shared (fast enough) |

**Note**: These limits are more than sufficient for MVP testing. The average evidence file (photo/PDF) is 1-5 MB.

## Monitoring Usage

1. Go to [Pinata Dashboard](https://app.pinata.cloud)
2. Check **Usage** section to monitor:
   - Storage used
   - Bandwidth consumed
   - Total pins (files)

## Alternative IPFS Services (If Needed)

If you need more features or storage:

1. **nft.storage** (Free, Protocol Labs)
   - Unlimited storage for NFTs
   - Good for metadata and images
   - https://nft.storage

2. **Infura IPFS** (Freemium)
   - 5 GB free storage
   - Part of Infura suite
   - https://infura.io/product/ipfs

3. **Filebase** (Paid but cheap)
   - S3-compatible IPFS storage
   - $5.99/TB/month
   - https://filebase.com

4. **Self-Hosted IPFS Node**
   - Free but requires infrastructure
   - Full control
   - Use `ipfs-http-client` package

## Testing

Test IPFS upload after setup:

```bash
# Start dev server
npm run dev

# Upload evidence on verifier page
# Check console for: ✅ File uploaded to IPFS: QmXxx...
```

## Troubleshooting

### Error: "PINATA_JWT environment variable is required"
- Make sure `.env` file exists in project root
- Verify the JWT is correctly copied
- Restart your dev server after adding env vars

### Error: "Unauthorized" or "Invalid JWT"
- JWT might be expired or deleted
- Generate a new API key in Pinata dashboard
- Update `.env` with new JWT

### Slow uploads
- Pinata free tier uses shared infrastructure
- Consider upgrading for production
- Files still upload reliably, just may take a few seconds

## Production Considerations

For production deployment:

1. ✅ Enable dedicated gateway ($20/month)
2. ✅ Set up custom domain (ipfs.yourcharity.org)
3. ✅ Enable submarine keys for private content
4. ✅ Set up webhook notifications for pin status
5. ✅ Monitor usage and upgrade plan if needed

## Support

- [Pinata Documentation](https://docs.pinata.cloud)
- [Pinata Discord](https://discord.gg/pinata)
- [IPFS Documentation](https://docs.ipfs.tech)