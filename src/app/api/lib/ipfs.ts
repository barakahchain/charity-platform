export async function getProjectMetadataFromIPFS(cid: string): Promise<any> {
  const cleanCid = cid.trim().replace(/['"]+/g, "");
  
  const gateways = [
    `https://ipfs.io/ipfs/${cleanCid}`,
    `https://cloudflare-ipfs.com/ipfs/${cleanCid}`,
    `https://gateway.pinata.cloud/ipfs/${cleanCid}`,
    `https://${cleanCid}.ipfs.dweb.link/`,
  ];

  for (const gateway of gateways) {
    try {
      const response = await fetch(gateway, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.log(`Gateway ${gateway} failed:`, error);
      continue;
    }
  }

  throw new Error(`Could not fetch metadata from any gateway for CID: ${cleanCid}`);
}