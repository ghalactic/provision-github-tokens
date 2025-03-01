export type AppInput = {
  appId: number;
  privateKey: string;
  issuer: AppInputIssuer;
  provisioner: AppInputProvisioner;
};

export type RawAppInput = {
  appId: number | string;
  privateKey: string;
  issuer: AppInputIssuer;
  provisioner: AppInputProvisioner;
};

export type AppInputIssuer = {
  enabled: boolean;
  roles: string[];
};

export type AppInputProvisioner = {
  enabled: boolean;
};
