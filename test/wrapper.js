const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

describe("Pixels On Chain Testing", function () {

    //////////////////////
    //Deploy Environment//
    //////////////////////

    async function deployEnvironment() {
        //Signers
        const [owner, addy0, addy1] = await ethers.getSigners();

        //Deploy Simple ERC721
        const simpleERC721 = await ethers.getContractFactory("SimpleERC721");
        const deployedSimpleERC721 = await simpleERC721.deploy();

        //Deploy Simple ERC1155
        const simpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
        const deployedSimpleERC1155 = await simpleERC1155.deploy();

        //ERC721 Wrapper Contract
        const erc721Wrapper = await ethers.getContractFactory("ERC721Wrapper");

        //ERC1155 Wrapper Contract
        const erc1155Wrapper = await ethers.getContractFactory("ERC721Wrapper");

        //Deploy Factory
        const factory = await ethers.getContractFactory("WrapperFactory");
        const deployedFactory = await factory.deploy();

        return { 
            owner,
            addy0,
            addy1,
            deployedFactory,
            deployedSimpleERC721,
            deployedSimpleERC1155,
            erc721Wrapper,
            erc1155Wrapper
        };
    }

    ///////////////////
    //Wrapper Factory//
    ///////////////////

    describe("Testing the Wrapper Factory", () => {
        it("Successfully create an ERC721 Wrapper from the factory", async function () {
            const { owner, erc721Wrapper, deployedFactory, deployedSimpleERC721 } = await loadFixture(deployEnvironment);

            await deployedFactory.CreateERC721Wrapper(deployedSimpleERC721.address);

            const newdeployedaddress = await deployedFactory.getERC721WrapperAddress(deployedSimpleERC721.address, 0);

            const newWrapperContract = erc721Wrapper.attach(newdeployedaddress);

            const name = await newWrapperContract.name();
            const symbol = await newWrapperContract.symbol();

            expect(name).to.equal("Wrapped Simple ERC721");
            expect(symbol).to.equal("wrSMPL");
        });
        it("Successfully create an ERC721 Wrapper of an already establed ERC721 Wrapper from the factory", async function () {
            const { owner, erc721Wrapper, deployedFactory, deployedSimpleERC721 } = await loadFixture(deployEnvironment);

            //Wrap One
            await deployedFactory.CreateERC721Wrapper(deployedSimpleERC721.address);
            const newdeployedaddress = await deployedFactory.getERC721WrapperAddress(deployedSimpleERC721.address, 0);
            const newWrapperContract = erc721Wrapper.attach(newdeployedaddress);

            //Wrap Two
            await deployedFactory.CreateERC721Wrapper(newWrapperContract.address);
            const newdeployedaddress0 = await deployedFactory.getERC721WrapperAddress(newWrapperContract.address, 1);
            const newWrapperContract0 = erc721Wrapper.attach(newdeployedaddress0);

            const name = await newWrapperContract0.name();
            const symbol = await newWrapperContract0.symbol();

            expect(name).to.equal("Wrapped Wrapped Simple ERC721");
            expect(symbol).to.equal("wrwrSMPL");
        });
    });

    //////////////////
    //ERC721 Wrapper//
    //////////////////

    describe("Testing the ERC721 Wrapper", () => {
        it("Immutables are set correctly", async function () {
            const { owner, erc721Wrapper, deployedFactory, deployedSimpleERC721 } = await loadFixture(deployEnvironment);

            //Create Wrapper
            await deployedFactory.CreateERC721Wrapper(deployedSimpleERC721.address);
            const newdeployedaddress = await deployedFactory.getERC721WrapperAddress(deployedSimpleERC721.address, 0);
            const newWrapperContract = await erc721Wrapper.attach(newdeployedaddress);

            const baseContract = await newWrapperContract.baseContract();

            const factoryContract = await newWrapperContract.wrapperFactory();

            expect(baseContract).to.equal(deployedSimpleERC721.address);

            expect(factoryContract).to.equal(deployedFactory.address);
        });
        it("UnSuccessfully Wrap an ERC721 because approval has not been granted", async function () {
            const { owner, erc721Wrapper, deployedFactory, deployedSimpleERC721 } = await loadFixture(deployEnvironment);

            //Create Wrapper
            await deployedFactory.CreateERC721Wrapper(deployedSimpleERC721.address);
            const newdeployedaddress = await deployedFactory.getERC721WrapperAddress(deployedSimpleERC721.address, 0);
            const newWrapperContract = await erc721Wrapper.attach(newdeployedaddress);

            //Mint a base NFT
            await deployedSimpleERC721.mintOne();

            await expect(newWrapperContract.wrap(0)).to.rejectedWith("ERC721Wrapper: Wrapper has not been approved to transfer the NFT.");
        });
        it("Successfully Wrap an ERC721 using the wrap function", async function () {
            const { owner, addy0, erc721Wrapper, deployedFactory, deployedSimpleERC721 } = await loadFixture(deployEnvironment);

            //Create Wrapper
            await deployedFactory.CreateERC721Wrapper(deployedSimpleERC721.address);
            const newdeployedaddress = await deployedFactory.getERC721WrapperAddress(deployedSimpleERC721.address, 0);
            const newWrapperContract = await erc721Wrapper.attach(newdeployedaddress);

            //Mint a base NFT
            await deployedSimpleERC721.mintOne();

            //Grant Approval
            await deployedSimpleERC721.setApprovalForAll(newWrapperContract.address, true);
            
            //Wrap
            await newWrapperContract.wrap(0);

            //Owner of SMPL 0 should be the wrapper
            expect(await deployedSimpleERC721.ownerOf(0)).to.equal(newWrapperContract.address);

            //Owner of wrSMPL 0 should be the "owner"
            expect(await newWrapperContract.ownerOf(0)).to.equal(owner.address);

            //Wrapper displays the underlying art correctly
            expect(await newWrapperContract.tokenURI(0)).to.equal("0# Art!");
        });
        it("Successfully Wrap an ERC721 using the safeTransfer functionality", async function () {
            const { owner, addy0, erc721Wrapper, deployedFactory, deployedSimpleERC721 } = await loadFixture(deployEnvironment);

            //Create Wrapper
            await deployedFactory.CreateERC721Wrapper(deployedSimpleERC721.address);
            const newdeployedaddress = await deployedFactory.getERC721WrapperAddress(deployedSimpleERC721.address, 0);
            const newWrapperContract = await erc721Wrapper.attach(newdeployedaddress);

            //Mint a base NFT
            await deployedSimpleERC721.connect(addy0).mintOne();

            //Safe Transfer
            await deployedSimpleERC721.connect(addy0)["safeTransferFrom(address,address,uint256)"](addy0.address, newWrapperContract.address, 0);

            //Owner of SMPL 0 should be the wrapper
            expect(await deployedSimpleERC721.ownerOf(0)).to.equal(newWrapperContract.address);

            //Owner of wrSMPL 0 should be the "owner"
            expect(await newWrapperContract.ownerOf(0)).to.equal(addy0.address);

            //Wrapper displays the underlying art correctly
            expect(await newWrapperContract.tokenURI(0)).to.equal("0# Art!");
        });
        it("Successfully Unwrap an ERC721 using the Unwrap function", async function () {
            const { owner, addy0, erc721Wrapper, deployedFactory, deployedSimpleERC721 } = await loadFixture(deployEnvironment);

            //Create Wrapper
            await deployedFactory.CreateERC721Wrapper(deployedSimpleERC721.address);
            const newdeployedaddress = await deployedFactory.getERC721WrapperAddress(deployedSimpleERC721.address, 0);
            const newWrapperContract = await erc721Wrapper.attach(newdeployedaddress);

            //Mint a base NFT
            await deployedSimpleERC721.mintOne();

            //Grant Approval
            await deployedSimpleERC721.setApprovalForAll(newWrapperContract.address, true);
            
            //Wrap
            await newWrapperContract.wrap(0);

            //Unwrap
            await newWrapperContract.unwrap(0);

            //Owner of SMPL 0 should be the owner
            expect(await deployedSimpleERC721.ownerOf(0)).to.equal(owner.address);

            //Owner of wrSMPL 0 should be the wrapper contract
            expect(await newWrapperContract.ownerOf(0)).to.equal(newWrapperContract.address);
        });
        it("Successfully Unwrap an ERC721 using the safeTransfer functionality", async function () {
            const { owner, addy0, erc721Wrapper, deployedFactory, deployedSimpleERC721 } = await loadFixture(deployEnvironment);

            //Create Wrapper
            await deployedFactory.CreateERC721Wrapper(deployedSimpleERC721.address);
            const newdeployedaddress = await deployedFactory.getERC721WrapperAddress(deployedSimpleERC721.address, 0);
            const newWrapperContract = await erc721Wrapper.attach(newdeployedaddress);

            //Mint a base NFT
            await deployedSimpleERC721.connect(addy0).mintOne();

            //Safe Transfer base token to wrapper
            await deployedSimpleERC721.connect(addy0)["safeTransferFrom(address,address,uint256)"](addy0.address, newWrapperContract.address, 0);

            //Then safeTransfer it back
            await newWrapperContract.connect(addy0)["safeTransferFrom(address,address,uint256)"](addy0.address, newWrapperContract.address, 0);

            //Owner of SMPL 0 should be addy0
            expect(await deployedSimpleERC721.ownerOf(0)).to.equal(addy0.address);

            //Owner of wrSMPL 0 should be wrapper
            expect(await newWrapperContract.ownerOf(0)).to.equal(newWrapperContract.address);
        });
        it("Unsuccessfully attempt to send a third ERC721 to the wrapper contract", async function () {
            const { owner, addy0, erc721Wrapper, deployedFactory, deployedSimpleERC721 } = await loadFixture(deployEnvironment);

            //Create Wrapper
            await deployedFactory.CreateERC721Wrapper(deployedSimpleERC721.address);
            const newdeployedaddress = await deployedFactory.getERC721WrapperAddress(deployedSimpleERC721.address, 0);
            const newWrapperContract = await erc721Wrapper.attach(newdeployedaddress);

            //Create a new ERC721
            const secondSimpleERC721 = await ethers.getContractFactory("SimpleERC721");
            const deployedSecondSimpleERC721 = await secondSimpleERC721.deploy();

            //Mint one
            await deployedSecondSimpleERC721.connect(addy0).mintOne();

            //attempt to send the other kind of ERC721
            await expect(deployedSecondSimpleERC721.connect(addy0)["safeTransferFrom(address,address,uint256)"](addy0.address, newWrapperContract.address, 0)).to.rejectedWith("ERC721Wrapper: may only transfer wrapped or base NFT.");
        });
        it("Successfully relayed ETH sent to it to the Factory", async function () {
            const { owner, addy0, erc721Wrapper, deployedFactory, deployedSimpleERC721 } = await loadFixture(deployEnvironment);

            //Create Wrapper
            await deployedFactory.CreateERC721Wrapper(deployedSimpleERC721.address);
            const newdeployedaddress = await deployedFactory.getERC721WrapperAddress(deployedSimpleERC721.address, 0);
            const newWrapperContract = await erc721Wrapper.attach(newdeployedaddress);

            //Send ETH to Wrapper
            await owner.sendTransaction({to: newWrapperContract.address, value: ethers.utils.parseEther("1")});

            const factoryBalance = await ethers.provider.getBalance(deployedFactory.address);

            expect(factoryBalance).to.equal(BigInt(1e18));
        });
        it("Successfully Re-wrap an ERC721 using the Unwrap function", async function () {
            const { owner, addy0, erc721Wrapper, deployedFactory, deployedSimpleERC721 } = await loadFixture(deployEnvironment);

            //Create Wrapper
            await deployedFactory.CreateERC721Wrapper(deployedSimpleERC721.address);
            const newdeployedaddress = await deployedFactory.getERC721WrapperAddress(deployedSimpleERC721.address, 0);
            const newWrapperContract = await erc721Wrapper.attach(newdeployedaddress);

            //Mint a base NFT
            await deployedSimpleERC721.mintOne();

            //Grant Approval
            await deployedSimpleERC721.setApprovalForAll(newWrapperContract.address, true);
            
            //Wrap
            await newWrapperContract.wrap(0);

            //Unwrap
            await newWrapperContract.unwrap(0);

            //Wrap again
            await newWrapperContract.wrap(0);

            //Owner of SMPL 0 should be the wrapper
            expect(await deployedSimpleERC721.ownerOf(0)).to.equal(newWrapperContract.address);

            //Owner of wrSMPL 0 should be the owner
            expect(await newWrapperContract.ownerOf(0)).to.equal(owner.address);
        });
        it("Successfully Re-wrap an ERC721 using the safeTransfer functionality", async function () {
            const { owner, addy0, erc721Wrapper, deployedFactory, deployedSimpleERC721 } = await loadFixture(deployEnvironment);

            //Create Wrapper
            await deployedFactory.CreateERC721Wrapper(deployedSimpleERC721.address);
            const newdeployedaddress = await deployedFactory.getERC721WrapperAddress(deployedSimpleERC721.address, 0);
            const newWrapperContract = await erc721Wrapper.attach(newdeployedaddress);

            //Mint a base NFT
            await deployedSimpleERC721.connect(addy0).mintOne();

            //Safe Transfer base token to wrapper
            await deployedSimpleERC721.connect(addy0)["safeTransferFrom(address,address,uint256)"](addy0.address, newWrapperContract.address, 0);

            //Then safeTransfer it back
            await newWrapperContract.connect(addy0)["safeTransferFrom(address,address,uint256)"](addy0.address, newWrapperContract.address, 0);

            //Safe Transfer base token to wrapper again
            await deployedSimpleERC721.connect(addy0)["safeTransferFrom(address,address,uint256)"](addy0.address, newWrapperContract.address, 0);

            //Owner of SMPL 0 should be the wrapper
            expect(await deployedSimpleERC721.ownerOf(0)).to.equal(newWrapperContract.address);

            //Owner of wrSMPL 0 should be wrapper
            expect(await newWrapperContract.ownerOf(0)).to.equal(addy0.address);
        });
    });
});