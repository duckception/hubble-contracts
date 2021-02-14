import { BigNumber, BigNumberish, BytesLike, ethers } from "ethers";
import { formatUnits, hexZeroPad, parseUnits } from "ethers/lib/utils";
import { EncodingError } from "./exceptions";
import { randHex } from "./utils";

/**
 * Parse the human readable value like "1.23" to the ERC20 integer amount.
 * @param humanValue could be a fractional number but is string. Like '1.23'
 * @param decimals The ERC20 decimals()
 * @returns the ERC20 integer amount. Like '1230000000000000000' but in BigNumber
 */
export function parseERC20(
    humanValue: string,
    decimals: number = 18
): BigNumber {
    return parseUnits(humanValue, decimals);
}

/**
 * Format the ERC20 integer amount to human readable value.
 * @param uint256Value is an integer like '1230000000000000000'
 * @param decimals The ERC20 decimals()
 * @returns Could be a fractional number but in string. Like '1.23'
 */
export function formatERC20(
    uint256Value: BigNumberish,
    decimals: number = 18
): string {
    return formatUnits(uint256Value, decimals);
}

export class Float {
    private mantissaMax: BigNumber;
    private exponentMax: number;
    private exponentMask: BigNumber;
    public bytesLength: number;
    constructor(
        public readonly exponentBits: number,
        public readonly mantissaBits: number
    ) {
        this.mantissaMax = BigNumber.from(2 ** mantissaBits - 1);
        this.exponentMax = 2 ** exponentBits - 1;
        this.exponentMask = BigNumber.from(this.exponentMax << mantissaBits);
        this.bytesLength = (mantissaBits + exponentBits) / 8;
    }

    public rand(): string {
        return randHex(this.bytesLength);
    }

    public randInt(): BigNumber {
        return this.decompress(this.rand());
    }

    /**
     * Round the input down to a compressible number.
     */
    public round(input: BigNumber): BigNumber {
        let mantissa = input;
        for (let exponent = 0; exponent < this.exponentMax; exponent++) {
            if (mantissa.lte(this.mantissaMax))
                return mantissa.mul(BigNumber.from(10).pow(exponent));
            mantissa = mantissa.div(10);
        }
        throw new EncodingError(`Can't cast input ${input.toString()}`);
    }

    public compress(input: BigNumberish): string {
        let mantissa = BigNumber.from(input.toString());
        let exponent = 0;
        for (; exponent < this.exponentMax; exponent++) {
            if (mantissa.isZero() || !mantissa.mod(10).isZero()) break;
            mantissa = mantissa.div(10);
        }
        if (mantissa.gt(this.mantissaMax))
            throw new EncodingError(
                `Cannot compress ${input}, expect mantissa ${mantissa} <= ${this.mantissaMax}`
            );

        const hex = BigNumber.from(exponent)
            .shl(this.mantissaBits)
            .add(mantissa)
            .toHexString();
        return hexZeroPad(hex, this.bytesLength);
    }
    public decompress(input: BytesLike): BigNumber {
        const mantissa = this.mantissaMax.and(input);
        const exponent = this.exponentMask.and(input).shr(this.mantissaBits);

        return mantissa.mul(BigNumber.from(10).pow(exponent));
    }
}

export const float2 = new Float(4, 12);

export class DecimalCodec {
    private mantissaMax: BigNumber;
    private exponentMax: number;
    private exponentMask: BigNumber;
    public bytesLength: number;

    constructor(
        public readonly exponentBits: number,
        public readonly mantissaBits: number,
        public readonly place: number
    ) {
        this.mantissaMax = BigNumber.from(2 ** mantissaBits - 1);
        this.exponentMax = 2 ** exponentBits - 1;
        this.exponentMask = BigNumber.from(this.exponentMax << mantissaBits);
        this.bytesLength = (mantissaBits + exponentBits) / 8;
    }
    public rand(): string {
        return randHex(this.bytesLength);
    }

    public randInt(): BigNumber {
        return this.decodeInt(this.rand());
    }

    /**
     * Given an arbitrary js number returns a js number that can be encoded.
     */
    public cast(input: number): number {
        if (input == 0) {
            return input;
        }

        const logMantissaMax = Math.log10(this.mantissaMax.toNumber());
        const logInput = Math.log10(input);
        const exponent = Math.floor(logMantissaMax - logInput);
        const mantissa = Math.floor(input * 10 ** exponent);

        return mantissa / 10 ** exponent;
    }

    /**
     * Given an arbitrary js number returns a integer that can be encoded
     */
    public castInt(input: number): BigNumber {
        const validNum = this.cast(input);
        return BigNumber.from(Math.round(validNum * 10 ** this.place));
    }

    /**
     * Find a BigNumber that's less than the input and compressable
     */
    public castBigNumber(input: BigNumber): BigNumber {
        let mantissa = input;
        for (let exponent = 0; exponent < this.exponentMax; exponent++) {
            if (mantissa.lte(this.mantissaMax))
                return mantissa.mul(BigNumber.from(10).pow(exponent));
            mantissa = mantissa.div(10);
        }
        throw new EncodingError(`Can't cast input ${input.toString()}`);
    }

    public encodeInt(input: BigNumberish): string {
        let exponent = 0;
        let mantissa = BigNumber.from(input.toString());
        for (let i = 0; i < this.exponentMax; i++) {
            if (!mantissa.isZero() && mantissa.mod(10).isZero()) {
                mantissa = mantissa.div(10);
                exponent += 1;
            } else {
                break;
            }
        }
        if (mantissa.gt(this.mantissaMax)) {
            throw new EncodingError(
                `Can not encode input ${input}, mantissa ${mantissa} should not be larger than ${this.mantissaMax}`
            );
        }
        const hex = BigNumber.from(exponent)
            .shl(this.mantissaBits)
            .add(mantissa)
            .toHexString();
        return ethers.utils.hexZeroPad(hex, this.bytesLength);
    }
    public decodeInt(input: BytesLike): BigNumber {
        const mantissa = this.mantissaMax.and(input);
        const exponent = this.exponentMask.and(input).shr(this.mantissaBits);

        return mantissa.mul(BigNumber.from(10).pow(exponent));
    }
}

export const USDT = new DecimalCodec(4, 12, 6);
