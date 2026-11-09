import axiosInstance from "./axios.config"

export type Disposition = "inline" | "attachment"

const filesApi = {
    // Fresh short-lived link for a file an agent generated (the one in the reply
    // expires after 7 days). disposition overrides how the browser treats it:
    // "inline" opens a PDF in the tab, "attachment" downloads an image.
    getUrl: async (key: string, options: { disposition?: Disposition; name?: string } = {}): Promise<string> => {
        const path = key.split("/").map(encodeURIComponent).join("/")
        const { data } = await axiosInstance.get<{ url: string }>(`/api/v1/agent/files/${path}`, {
            params: options.disposition ? { disposition: options.disposition, name: options.name } : undefined,
        })
        return data.url
    },
}

export default filesApi
