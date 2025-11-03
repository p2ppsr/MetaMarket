import {
  AuthFetch,
  PushDrop,
  StorageUploader,
  StorageUtils,
  SymmetricKey,
  TopicBroadcaster,
  Transaction,
  Utils,
} from "@bsv/sdk";
import constants from "../constants";
import BabbageGo from "@babbage/go";

export async function publishCommitment({
  file,
  name,
  description,
  satoshis,
  publicKey,
  expiration,
  coverImage,
  setStatusText,
}: {
  file: File;
  name: string;
  description: string;
  satoshis: number;
  publicKey: string;
  expiration: number;
  coverImage: File;
  setStatusText: (text: string) => void;
}): Promise<string> {
  try {
    const storageURL = "https://nanostore.babbage.systems";

    // Encrypting STL File
    const symmetricKey = SymmetricKey.fromRandom();

    const fileArray = Array.from(new Uint8Array(await file.arrayBuffer()));
    const encryptedFile = symmetricKey.encrypt(fileArray) as number[];

    const uploadableFile = {
      data: encryptedFile,
      type: file.type,
    };

    if (!uploadableFile) {
      setStatusText("Error uploading STL file.");
      throw new Error("Could not prepare STL file.");
    }

    // Storing the file on the Market host
    const retentionPeriod = expiration * 24 * 60;

    const wallet = new BabbageGo(undefined, {
      showModal: true,
      design: {
        preset: "auroraPulse",
      },
    });
    const storageUploader = new StorageUploader({ storageURL, wallet });

    setStatusText("Uploading files to UHRP...");
    const stl = await storageUploader.publishFile({
      file: uploadableFile,
      retentionPeriod,
    });
    console.log(`STL File Url: ${stl.uhrpURL}`);
    console.log(StorageUtils.isValidURL(stl.uhrpURL));

    const coverArray = Array.from(
      new Uint8Array(await coverImage.arrayBuffer())
    );
    const uploadableCover = {
      data: coverArray,
      type: coverImage.type,
    };
    // Storing the cover image on Market
    const cover = await storageUploader.publishFile({
      file: uploadableCover,
      retentionPeriod,
    });

    const expiryTime = Date.now() + expiration * 60 * 60 * 24 * 1000;

    const fields = [
      Utils.toArray(stl.uhrpURL, "utf8"),
      Utils.toArray(name, "utf8"),
      Utils.toArray(description, "utf8"),
      Utils.toArray("" + satoshis, "utf8"),
      Utils.toArray(publicKey, "utf8"),
      Utils.toArray("" + file.size, "utf8"),
      Utils.toArray("" + expiryTime, "utf8"),
      Utils.toArray(cover.uhrpURL, "utf8"),
    ];
    const pushdrop = new PushDrop(wallet);
    const lockingScript = await pushdrop.lock(
      fields,
      [2, "metamarket"],
      "1",
      "anyone",
      true
    );

    console.log(
      `${stl.uhrpURL}\n${name}\n${description}\n${satoshis}\n${publicKey}\n${file.size}\n${expiryTime}\n${cover.uhrpURL}`
    );
    const { txid, tx } = await wallet.createAction({
      outputs: [
        {
          lockingScript: lockingScript.toHex(),
          satoshis: 1,
          outputDescription: "metamarket upload token",
        },
      ],
      description: "publish to metamarket UHRP",
      options: {
        acceptDelayedBroadcast: false,
        randomizeOutputs: false,
      },
    });
    if (!tx) {
      setStatusText("Error creating transcation data");
      throw new Error("Error creating action");
    }

    setStatusText("Broadcasting transcation");
    const broadcaster = new TopicBroadcaster(["tm_market"], {
      networkPreset:
        window.location.hostname === "localhost" ? "local" : "mainnet",
    });
    const backendResponse = await broadcaster.broadcast(
      Transaction.fromAtomicBEEF(tx)
    );
    console.log("Backed server response:", backendResponse);

    setStatusText("Registering with MetaMarket...");
    // Uploading encryption key to key server
    const authFetch = new AuthFetch(wallet);
    const body = {
      fileUrl: stl.uhrpURL,
      encryptionKey: symmetricKey.toHex(),
      satoshis,
      publicKey,
    };

    try {
      const response = await authFetch.fetch(`${constants.keyServer}/submit`, {
        method: "POST",
        body,
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
    } catch (error) {
      setStatusText("Error uploading to MetaMarket");
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Redeeming the transaction created before
      const { signableTransaction } = await wallet.createAction({
        inputBEEF: tx,
        inputs: [
          {
            outpoint: `${txid}.0`,
            unlockingScriptLength: 74, // PushDrop scripts tend to be around 74
            inputDescription: "metamarket upload token",
          },
        ],
        description: "spending token from metamarket UHRP",
      });
      if (!signableTransaction) throw new Error("Token must be spendable");

      const unlocker = pushdrop.unlock(
        [2, "metamarket"],
        "1",
        "anyone",
        undefined,
        true
      );

      const partialTx = Transaction.fromAtomicBEEF(signableTransaction.tx);
      const unlockingScript = await unlocker.sign(partialTx, 0);

      const action = await wallet.signAction({
        reference: signableTransaction.reference,
        spends: {
          0: {
            unlockingScript: unlockingScript.toHex(),
          },
        },
      });
      if (!action) throw new Error("Spend token failed.");

      const spend = await broadcaster.broadcast(
        Transaction.fromAtomicBEEF(action.tx as number[])
      );
      console.log("Token Spent:", spend);
      throw new Error("Key server registration failed.");
    }

    return "Upload successful!!!";
  } catch (error) {
    setStatusText("");
    console.error("Error publishing commitment:", error);
    throw `Error publishing commitment: ${error}`;
  }
}
