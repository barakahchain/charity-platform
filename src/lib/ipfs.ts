import { PinataSDK } from "pinata-web3";

/**
 * Get Pinata client instance
 */
function getPinataClient() {
  const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;

  if (!jwt) {
    throw new Error("PINATA_JWT environment variable is required");
  }

  return new PinataSDK({
    pinataJwt: jwt,
  });
}

/**
 * Upload file to IPFS via Pinata
 * @param file File buffer or Blob
 * @param filename Name of the file
 * @returns IPFS CID
 */
export async function uploadToIPFS(
  file: Buffer | Blob,
  filename: string
): Promise<string> {
  try {
    const pinata = getPinataClient();

    // Convert Buffer to File if needed
    let blob: Blob;
    if (file instanceof Blob) {
      blob = file;
    } else if (Buffer.isBuffer(file)) {
      blob = new Blob([new Uint8Array(file)]);
    } else {
      throw new Error("Invalid file type: must be Buffer or Blob");
    }
    const fileToUpload = new File([blob], filename);

    // Upload to IPFS via Pinata
    const upload = await pinata.upload.file(fileToUpload);

    console.log(`✅ File uploaded to IPFS: ${upload.IpfsHash}`);
    return upload.IpfsHash;
  } catch (error) {
    console.error("❌ IPFS upload error:", error);
    throw new Error(`Failed to upload to IPFS: ${error}`);
  }
}

/**
 * Upload JSON metadata to IPFS
 * @param data JSON data object
 * @param filename Name for the JSON file
 * @returns IPFS CID
 */
export async function uploadJSONToIPFS(
  data: any,
  filename: string = "metadata.json"
): Promise<string> {
  try {
    const pinata = getPinataClient();

    // Upload JSON directly
    const upload = await pinata.upload.json(data);

    console.log(`✅ JSON uploaded to IPFS: ${upload.IpfsHash}`);
    return upload.IpfsHash;
  } catch (error) {
    console.error("❌ IPFS JSON upload error:", error);
    throw new Error(`Failed to upload JSON to IPFS: ${error}`);
  }
}

/**
 * Get IPFS gateway URL for a CID
 * @param cid IPFS CID
 * @returns Gateway URL
 */
export function getIPFSGatewayURL(cid: string): string {
  // Using Pinata's dedicated gateway
  const gatewayUrl =
    process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";
  return `${gatewayUrl}/ipfs/${cid}`;
}

/**
 * Upload multiple files to IPFS as a directory
 * @param files Array of {filename, content} objects
 * @returns IPFS directory CID
 */
export async function uploadDirectoryToIPFS(
  files: Array<{ filename: string; content: Buffer | Blob }>
): Promise<string> {
  try {
    const pinata = getPinataClient();

    // Convert all to File objects safely
    const fileObjects = files.map(({ filename, content }) => {
      let blob: Blob;

      if (content instanceof Blob) {
        blob = content;
      } else if (Buffer.isBuffer(content)) {
        // Convert Buffer → Uint8Array → Blob
        blob = new Blob([new Uint8Array(content)]);
      } else {
        throw new Error("Invalid content type: must be Buffer or Blob");
      }

      return new File([blob], filename);
    });

    // Upload as a group
    const upload = await pinata.upload.fileArray(fileObjects);

    console.log(`✅ Directory uploaded to IPFS: ${upload.IpfsHash}`);
    return upload.IpfsHash;
  } catch (error) {
    console.error("❌ IPFS directory upload error:", error);
    throw new Error(`Failed to upload directory to IPFS: ${error}`);
  }
}

/**
 * Check if file exists on IPFS
 * @param cid IPFS CID
 * @returns true if accessible
 */
export async function checkIPFSAvailability(cid: string): Promise<boolean> {
  try {
    const url = getIPFSGatewayURL(cid);
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch (error) {
    console.error(`❌ IPFS availability check failed for ${cid}:`, error);
    return false;
  }
}
