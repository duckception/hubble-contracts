import {ethers} from "ethers";

// returns parent node hash given child node hashes
export function getParentLeaf(left: string, right: string) {
  var abiCoder = ethers.utils.defaultAbiCoder;
  var hash = ethers.utils.keccak256(
    abiCoder.encode(["bytes32", "bytes32"], [left, right])
  );
  return hash;
}

export function Hash(data: string) {
  // var dataBytes = ethers.utils.toUtf8Bytes(data);
  return ethers.utils.keccak256(data);
}

export function StringToBytes32(data: string) {
  return ethers.utils.formatBytes32String(data);
}

export function BytesFromAccountData(
  ID: number,
  balance: number,
  nonce: number,
  token: number
) {
  var abiCoder = ethers.utils.defaultAbiCoder;

  return abiCoder.encode(
    ["uint256", "uint256", "uint256", "uint256"],
    [ID, balance, nonce, token]
  );
}

export function CreateAccountLeaf(
  ID: number,
  balance: number,
  nonce: number,
  token: number
) {
  var data = BytesFromAccountData(ID, balance, nonce, token);
  return Hash(data);
}

// returns parent node hash given child node hashes
export async function defaultHashes(depth: number) {
  var zeroValue = 0;
  var defaultHashes = [];
  var abiCoder = ethers.utils.defaultAbiCoder;
  var zeroHash = ethers.utils.keccak256(
    abiCoder.encode(["uint256"], [zeroValue])
  );
  defaultHashes[0] = zeroHash;

  for (let i = 1; i < depth; i++) {
    defaultHashes[i] = getParentLeaf(
      defaultHashes[i - 1],
      defaultHashes[i - 1]
    );
  }

  return defaultHashes;
}
