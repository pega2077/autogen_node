declare module 'dockerode' {
  export interface ImageInfo {
    RepoTags?: (string | null | undefined)[];
  }

  export interface Container {
    start(): Promise<void>;
    wait(): Promise<{ StatusCode: number }>;
    logs(options: {
      stdout: boolean;
      stderr: boolean;
      follow: boolean;
    }): Promise<Buffer>;
    stop(): Promise<void>;
  }

  export interface ContainerCreateOptions {
    Image: string;
    Cmd: string[];
    AttachStdout?: boolean;
    AttachStderr?: boolean;
    Tty?: boolean;
    NetworkDisabled?: boolean;
    HostConfig?: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface Dockerode {
    getImage(image: string): {
      inspect(): Promise<unknown>;
      remove(): Promise<void>;
    };
    pull(
      image: string,
      callback: (err: unknown, stream: unknown) => void
    ): void;
    createContainer(options: ContainerCreateOptions): Promise<Container>;
    listImages(options?: unknown): Promise<ImageInfo[]>;
    ping(): Promise<void>;
    modem: {
      followProgress(stream: unknown, callback: (err: unknown) => void): void;
    };
  }

  const DockerodeConstructor: {
    new (options?: Record<string, unknown>): Dockerode;
  };

  export default DockerodeConstructor;
}
