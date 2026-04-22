// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EnergyCertificate is ERC721, Ownable {
    using Strings for uint256;
    using Strings for address;

    uint256 private _nextTokenId;

    struct CertificateData {
        uint256 amount; // kWh
        address producer;
        uint256 timestamp;
    }

    mapping(uint256 => CertificateData) public certificates;
    mapping(address => bool) public authorizedMinters;

    event CertificateMinted(uint256 indexed tokenId, address indexed consumer, address indexed producer, uint256 amount);

    constructor() ERC721("Renewable Energy Certificate", "REC") Ownable(msg.sender) {
        _nextTokenId = 1;
    }

    function setAuthorizedMinter(address minter, bool authorized) external onlyOwner {
        authorizedMinters[minter] = authorized;
    }

    function mintCertificate(address consumer, address producer, uint256 amount) external returns (uint256) {
        require(authorizedMinters[msg.sender], "Not authorized to mint certificates");
        
        uint256 tokenId = _nextTokenId++;
        certificates[tokenId] = CertificateData({
            amount: amount,
            producer: producer,
            timestamp: block.timestamp
        });

        _safeMint(consumer, tokenId);
        
        emit CertificateMinted(tokenId, consumer, producer, amount);
        return tokenId;
    }

    struct TierDetails {
        string name;
        string bg1;
        string bg2;
        string p1;
        string p2;
    }

    function getTierDetails(uint256 amount) internal pure returns (TierDetails memory) {
        if (amount <= 50) {
            // Bronze: Green / Purple
            return TierDetails("Bronze", "#0f172a", "#1e293b", "#00ff88", "#8a5cf6");
        } else if (amount <= 200) {
            // Silver: Ice Blue / Metallic
            return TierDetails("Silver", "#0f172a", "#334155", "#e2e8f0", "#94a3b8");
        } else if (amount <= 500) {
            // Gold: Glowing Amber / Gold
            return TierDetails("Gold", "#2e1503", "#422006", "#ffd700", "#f97316");
        } else {
            // Diamond: Cyan / Indigo
            return TierDetails("Diamond", "#082f49", "#0c4a6e", "#38bdf8", "#818cf8");
        }
    }

    function constructJSON(
        uint256 tokenId,
        CertificateData memory cert,
        TierDetails memory tier,
        string memory svg
    ) internal pure returns (string memory) {
        string memory p1 = string.concat('{"name": "Green Energy Certificate #', tokenId.toString(), '", "description": "Official on-chain proof of renewable energy purchase.", "attributes": [');
        string memory p2 = string.concat('{"trait_type": "Tier", "value": "', tier.name, '"}, {"trait_type": "Energy Source", "value": "Solar"},');
        string memory p3 = string.concat('{"trait_type": "Amount (kWh)", "value": "', cert.amount.toString(), '"},');
        string memory p4 = string.concat('{"display_type": "date", "trait_type": "Mint Date", "value": ', cert.timestamp.toString(), '}');
        string memory p5 = string.concat('], "image": "data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}');
        
        string memory finalStr = string.concat(p1, p2, p3);
        finalStr = string.concat(finalStr, p4, p5);
        return Base64.encode(bytes(finalStr));
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        CertificateData memory cert = certificates[tokenId];
        address owner = ownerOf(tokenId);
        TierDetails memory tier = getTierDetails(cert.amount);
        string memory svg = generateSVG(tokenId, cert, owner, tier);

        return string.concat("data:application/json;base64,", constructJSON(tokenId, cert, tier, svg));
    }

    struct SVGParams {
        string producerStr;
        string ownerStr;
        string amountStr;
        string tsStr;
        string idStr;
    }

    function renderDefs(TierDetails memory t) internal pure returns (string memory) {
        string memory s1 = string(abi.encodePacked('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="100%" height="100%">', '<defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">', '<stop offset="0%" stop-color="', t.bg1, '"/>'));
        string memory s2 = string(abi.encodePacked('<stop offset="50%" stop-color="', t.bg2, '"/>', '<stop offset="100%" stop-color="', t.bg1, '"/></linearGradient>'));
        string memory s3 = string(abi.encodePacked('<linearGradient id="primary" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="', t.p1, '"/>', '<stop offset="100%" stop-color="', t.p2, '"/></linearGradient>'));
        return string.concat(s1, s2, s3);
    }

    function renderStyle(TierDetails memory t) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<style>@keyframes pulse { 0% { stroke-opacity: 0.5; } 50% { stroke-opacity: 1; stroke-width: 6; filter: drop-shadow(0 0 8px ', t.p1, '); } 100% { stroke-opacity: 0.5; } } .border { animation: pulse 4s infinite ease-in-out; }</style></defs>',
            '<rect width="400" height="500" rx="16" fill="url(#bg)" stroke="url(#primary)" stroke-width="4" class="border"/>'
        ));
    }

    function renderHeader(TierDetails memory t, string memory amountStr) internal pure returns (string memory) {
        string memory h1 = string(abi.encodePacked('<text x="200" y="45" font-family="monospace" font-size="12" fill="', t.p2, '" font-weight="bold" text-anchor="middle" letter-spacing="2">', t.name));
        string memory h2 = string(abi.encodePacked(' TIER</text><text x="200" y="65" font-family="monospace" font-size="14" fill="', t.p2, '" font-weight="bold" text-anchor="middle" letter-spacing="2">RENEWABLE ENERGY</text>'));
        string memory h3 = string(abi.encodePacked('<text x="200" y="85" font-family="monospace" font-size="20" fill="', t.p1, '" font-weight="bold" text-anchor="middle" letter-spacing="4">CERTIFICATE</text>'));
        string memory h4 = string(abi.encodePacked('<line x1="50" y1="105" x2="350" y2="105" stroke="rgba(255,255,255,0.2)" stroke-width="1"/><text x="200" y="200" font-family="sans-serif" font-size="64" fill="', t.p1));
        string memory h5 = string(abi.encodePacked('" font-weight="900" text-anchor="middle">', amountStr, '</text><text x="200" y="240" font-family="monospace" font-size="18" fill="', t.p2, '" text-anchor="middle">kWh</text>'));
        return string.concat(h1, h2, h3, h4, h5);
    }

    function renderFooter(TierDetails memory t, SVGParams memory p) internal pure returns (string memory) {
        string memory f1 = string(abi.encodePacked('<rect x="25" y="320" width="350" height="140" fill="rgba(0,0,0,0.4)" rx="8"/><text x="40" y="350" font-family="monospace" font-size="12" fill="#94a3b8">CERT ID:</text>'));
        string memory f2 = string(abi.encodePacked('<text x="130" y="350" font-family="monospace" font-size="14" fill="', t.p1, '" font-weight="bold">#', p.idStr, '</text><text x="40" y="380" font-family="monospace" font-size="12" fill="#94a3b8">PRODUCER:</text>'));
        string memory f3 = string(abi.encodePacked('<text x="130" y="380" font-family="monospace" font-size="12" fill="#e2e8f0">', p.producerStr, '...</text><text x="40" y="410" font-family="monospace" font-size="12" fill="#94a3b8">CONSUMER:</text>'));
        string memory f4 = string(abi.encodePacked('<text x="130" y="410" font-family="monospace" font-size="12" fill="#e2e8f0">', p.ownerStr, '...</text><text x="40" y="440" font-family="monospace" font-size="12" fill="#94a3b8">TIMESTAMP:</text>'));
        string memory f5 = string(abi.encodePacked('<text x="130" y="440" font-family="monospace" font-size="12" fill="#e2e8f0">', p.tsStr, '</text><text x="200" y="485" font-family="monospace" font-size="10" fill="rgba(255,255,255,0.4)" text-anchor="middle">OFFICIAL ON-CHAIN RECORD</text></svg>'));
        return string.concat(f1, f2, f3, f4, f5);
    }

    function generateSVG(
        uint256 tokenId, 
        CertificateData memory cert, 
        address owner, 
        TierDetails memory tier
    ) internal pure returns (string memory) {
        SVGParams memory p = SVGParams({
            producerStr: substring(cert.producer.toHexString(), 0, 8),
            ownerStr: substring(owner.toHexString(), 0, 8),
            amountStr: cert.amount.toString(),
            tsStr: cert.timestamp.toString(),
            idStr: tokenId.toString()
        });

        string memory c1 = string.concat(renderDefs(tier), renderStyle(tier));
        string memory c2 = string.concat(renderHeader(tier, p.amountStr), renderFooter(tier, p));
        return string.concat(c1, c2);
    }
    
    // Helper functionality for string substrings to abbreviate addresses in SVG
    function substring(string memory str, uint startIndex, uint endIndex) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        for(uint i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
    }
}
